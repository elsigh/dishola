import { supabase } from "@dishola/supabase/admin"
import { createError, defineEventHandler, getQuery, setHeader } from "h3"
import { createLogger } from "../../lib/logger"

export default defineEventHandler(async (event) => {
  const logger = createLogger(event, 'public-profile')
  setHeader(
    event,
    "Access-Control-Allow-Origin",
    process.env.NODE_ENV === "production" ? "https://dishola.com" : "http://localhost:3000"
  )
  setHeader(event, "Access-Control-Allow-Methods", "GET,OPTIONS")
  setHeader(event, "Access-Control-Allow-Headers", "Content-Type")

  if (event.method === "OPTIONS") {
    return new Response(null, { status: 204 })
  }

  if (event.method === "GET") {
    const { username } = getQuery(event)
    if (!username || typeof username !== "string") {
      throw createError({ statusCode: 400, statusMessage: "Missing or invalid username" })
    }

    try {
      // Get profile by username
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .eq("username", username)
        .single()

      if (profileError || !profileData) {
        throw createError({ statusCode: 404, statusMessage: "User not found" })
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
        .eq("user_id", profileData.user_id)
        .order("order_position")

      if (tastesError) {
        logger.error("Error fetching user tastes", { error: tastesError })
      }

      return {
        username: profileData.username,
        display_name: profileData.display_name,
        avatar_url: profileData.avatar_url,
        tastes: tastesData || []
      }
    } catch (error) {
      logger.error("Error in getUserProfileByUsername", { error })
      if (error.statusCode) {
        throw error
      }
      throw createError({ statusCode: 500, statusMessage: "Internal server error" })
    }
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" })
})
