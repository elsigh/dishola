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
    logger.error({ authError, message: "Auth error occurred" })
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
        logger.error({ fetchError, userId: user.id, message: "Error fetching profile" })
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
        logger.error({ tastesError, userId: user.id, message: "Error fetching user tastes" })
        // Don't throw error for tastes, just log it and continue without tastes
      }

      return {
        id: user.id,
        email: user.email,
        display_name: profileData?.display_name || null,
        avatar_url: profileData?.avatar_url || null,
        username: profileData?.username || null,
        tastes: tastesData || []
      }
    } catch (error) {
      logger.error({ error, message: "Profile fetch error" })
      if (error.statusCode) {
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

    logger.log({ userId: user.id, data: validatedBody, message: "Updating profile for user" })

    try {
      // First, check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("user_id", user.id)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        logger.error({ checkError, userId: user.id, message: "Error checking existing profile" })
        throw createError({ statusCode: 500, statusMessage: "Failed to check existing profile" })
      }

      let updateError: any = null

      if (existingProfile) {
        // Profile exists, update it using regular Supabase client
        logger.log({ profileId: existingProfile.id, message: "Updating existing profile" })

        const { data: updateData, error } = await supabase
          .from("profiles")
          .update({
            username,
            display_name,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id)
          .select()

        logger.log({ data: updateData, error, message: "Update result" })
        updateError = error
      } else {
        // Profile doesn't exist, create it
        logger.log({ userId: user.id, message: "Creating new profile for user" })
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
        logger.error({ updateError, userId: user.id, message: "Error updating/creating profile" })
        throw createError({ statusCode: 500, statusMessage: "Failed to update profile" })
      }

      // Return the updated profile
      const { data: profileData, error: fetchError } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("user_id", user.id)
        .single()

      if (fetchError) {
        logger.error({ fetchError, userId: user.id, message: "Error fetching updated profile" })
        throw createError({ statusCode: 500, statusMessage: "Failed to fetch updated profile" })
      }

      return {
        id: user.id,
        email: user.email,
        display_name: profileData?.display_name || null,
        avatar_url: profileData?.avatar_url || null,
        username: profileData?.username || null
      }
    } catch (error) {
      logger.error({ error, message: "Profile update error" })
      if (error.statusCode) {
        throw error
      }
      throw createError({ statusCode: 500, statusMessage: "Internal server error" })
    }
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" })
})
