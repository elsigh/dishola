import { type ProfileResponse, ProfileUpdateRequestSchema } from "@dishola/types"
import { createClient } from "@supabase/supabase-js"
import { createError, defineEventHandler, getHeader, readBody, setHeader } from "h3"
import { createLogger } from "../../lib/logger"

export default defineEventHandler(async (event): Promise<ProfileResponse> => {
  const logger = createLogger(event, 'profile')
  setHeader(
    event,
    "Access-Control-Allow-Origin",
    process.env.NODE_ENV === "production" ? "https://dishola.com" : "http://localhost:3000"
  )
  setHeader(event, "Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  setHeader(event, "Access-Control-Allow-Headers", "Content-Type, Authorization, Cache-Control")

  if (event.method === "OPTIONS") {
    return new Response(null, { status: 204 }) as any
  }

  // Get user from Authorization header
  const authHeader = getHeader(event, "authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError({ statusCode: 401, statusMessage: "Missing or invalid authorization header" })
  }
  const token = authHeader.split(" ")[1]

  // Create Supabase client with user's token
  // biome-ignore lint/style/noNonNullAssertion: zerofux
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  // Validate the user token
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()
  if (authError || !user) {
    logger.error("Auth error occurred", { authError })
    throw createError({ statusCode: 401, statusMessage: "Invalid authentication token" })
  }

  //logger.log({ userId: user.id, message: "Authenticated user ID" })

  if (event.method === "GET") {
    try {
      // Get the user's profile
      const { data: profileData, error: fetchError } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("user_id", user.id)
        .single()

      if (fetchError && fetchError.code !== "PGRST116") {
        logger.error("Error fetching profile", { fetchError, userId: user.id })
        throw createError({ statusCode: 500, statusMessage: `Failed to fetch profile for user.id: ${user.id}` })
      }

      // Get user's tastes
      const { data: tastesData, error: tastesError } = await supabase
        .from("user_tastes")
        .select(`
          id,
          order_position,
          taste_dictionary:taste_dictionary_id (
            id,
            name,
            type,
            image_url
          )
        `)
        .eq("user_id", user.id)
        .order("order_position")

      if (tastesError) {
        logger.error("Error fetching user tastes", { tastesError, userId: user.id })
        // Don't throw error for tastes, just log it and continue without tastes
      }

      return {
        id: user.id,
        email: user.email,
        display_name: profileData?.display_name || null,
        avatar_url: profileData?.avatar_url || null,
        username: profileData?.username || null,
        tastes: (tastesData || []).map((taste: any) => ({
          id: taste.id,
          order_position: taste.order_position,
          taste_dictionary: Array.isArray(taste.taste_dictionary) 
            ? taste.taste_dictionary[0] 
            : taste.taste_dictionary
        }))
      }
    } catch (error: unknown) {
      logger.error("Profile fetch error", { error })
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error
      }
      throw createError({ statusCode: 500, statusMessage: "Internal server error" })
    }
  }

  if (event.method === "POST") {
    const body = await readBody(event)

    // Validate request body using shared schema
    const validatedBody = ProfileUpdateRequestSchema.parse(body)
    const { display_name, username } = validatedBody

    logger.log("Updating profile for user", { userId: user.id, data: validatedBody })

    try {
      // First, check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("user_id", user.id)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        logger.error("Error checking existing profile", { checkError, userId: user.id })
        throw createError({ statusCode: 500, statusMessage: "Failed to check existing profile" })
      }

      let updateError: any = null

      if (existingProfile) {
        // Profile exists, update it using regular Supabase client
        logger.log("Updating existing profile", { profileId: existingProfile.id })

        const { data: updateData, error } = await supabase
          .from("profiles")
          .update({
            username,
            display_name,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id)
          .select()

        logger.log("Update result", { data: updateData, error })
        updateError = error
      } else {
        // Profile doesn't exist, create it
        logger.log("Creating new profile for user", { userId: user.id })
        const { error } = await supabase.from("profiles").insert({
          user_id: user.id,
          display_name,
          username,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        updateError = error
      }

      if (updateError) {
        logger.error("Error updating/creating profile", { updateError, userId: user.id })
        throw createError({ statusCode: 500, statusMessage: "Failed to update profile" })
      }

      // Return the updated profile
      const { data: profileData, error: fetchError } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("user_id", user.id)
        .single()

      if (fetchError) {
        logger.error("Error fetching updated profile", { fetchError, userId: user.id })
        throw createError({ statusCode: 500, statusMessage: "Failed to fetch updated profile" })
      }

      return {
        id: user.id,
        email: user.email,
        display_name: profileData?.display_name || null,
        avatar_url: profileData?.avatar_url || null,
        username: profileData?.username || null
      }
    } catch (error: unknown) {
      logger.error("Profile update error", { error })
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error
      }
      throw createError({ statusCode: 500, statusMessage: "Internal server error" })
    }
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" })
})
