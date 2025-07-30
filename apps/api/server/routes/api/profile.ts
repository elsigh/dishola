import { type ProfileResponse, ProfileUpdateRequestSchema } from "@dishola/types"
import { createClient } from "@supabase/supabase-js"
import { createError, getHeader, readBody, setHeader } from "h3"

export default defineEventHandler(async (event): Promise<ProfileResponse> => {
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
    console.error("Auth error:", authError)
    throw createError({ statusCode: 401, statusMessage: "Invalid authentication token" })
  }

  console.log("Authenticated user ID:", user.id)

  if (event.method === "GET") {
    try {
      // Get the user's profile
      const { data: profileData, error: fetchError } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("user_id", user.id)
        .single()

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching profile:", fetchError)
        throw createError({ statusCode: 500, statusMessage: `Failed to fetch profile for user.id: ${user.id}` })
      }

      return {
        id: user.id,
        email: user.email,
        display_name: profileData?.display_name || null,
        avatar_url: profileData?.avatar_url || null,
        username: profileData?.username || null
      }
    } catch (error) {
      console.error("Profile fetch error:", error)
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

    console.log("Updating profile for user:", user.id, "with data:", validatedBody)

    try {
      // First, check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("user_id", user.id)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking existing profile:", checkError)
        throw createError({ statusCode: 500, statusMessage: "Failed to check existing profile" })
      }

      let updateError: any = null

      if (existingProfile) {
        // Profile exists, update it using regular Supabase client
        console.log("Updating existing profile:", existingProfile.id)

        const { data: updateData, error } = await supabase
          .from("profiles")
          .update({
            username,
            display_name,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id)
          .select()

        console.log("Update result:", { data: updateData, error })
        updateError = error
      } else {
        // Profile doesn't exist, create it
        console.log("Creating new profile for user:", user.id)
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
        console.error("Error updating/creating profile:", updateError)
        throw createError({ statusCode: 500, statusMessage: "Failed to update profile" })
      }

      // Return the updated profile
      const { data: profileData, error: fetchError } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("user_id", user.id)
        .single()

      if (fetchError) {
        console.error("Error fetching updated profile:", fetchError)
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
      console.error("Profile update error:", error)
      if (error.statusCode) {
        throw error
      }
      throw createError({ statusCode: 500, statusMessage: "Internal server error" })
    }
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" })
})
