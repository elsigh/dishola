import { supabase } from "@dishola/supabase/admin"
import { setHeader } from "h3"

export default defineEventHandler(async (event) => {
  setHeader(
    event,
    "Access-Control-Allow-Origin",
    process.env.NODE_ENV === "production" ? "https://dishola.com" : "http://localhost:3000"
  )
  setHeader(event, "Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  setHeader(event, "Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (event.method === "OPTIONS") {
    return new Response(null, { status: 204 })
  }

  // Get user from Authorization header
  const authHeader = getHeader(event, "authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError({ statusCode: 401, statusMessage: "Missing or invalid authorization header" })
  }
  const token = authHeader.split(" ")[1]
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser(token)
  if (authError || !user) {
    throw createError({ statusCode: 401, statusMessage: "Invalid authentication token" })
  }

  if (event.method === "POST") {
    const body = await readBody(event)
    const { display_name, username } = body

    // Validate username format if provided
    if (username && !/^[a-z0-9_]+$/.test(username)) {
      throw createError({ statusCode: 400, statusMessage: "Invalid username format" })
    }

    try {
      // Update the profiles table
      const { error: updateError } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          display_name,
          username,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      )

      if (updateError) {
        console.error("Error updating profile:", updateError)
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
        display_name: profileData?.display_name,
        avatar_url: profileData?.avatar_url,
        username: profileData?.username
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
