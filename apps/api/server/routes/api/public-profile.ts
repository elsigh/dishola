import { supabase } from "@dishola/supabase/admin"
import { createError, defineEventHandler, getQuery } from "h3"
import { createLogger } from "../../lib/logger"
import { setCorsHeaders } from "../../lib/cors"

export default defineEventHandler(async (event) => {
  const logger = createLogger({ event, handlerName: "public-profile" })
  // Handle CORS
  const corsResponse = setCorsHeaders(event, { methods: ["GET", "OPTIONS"], headers: ["Content-Type"] })
  if (corsResponse) return corsResponse

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
    } catch (error: unknown) {
      logger.error("Error in getUserProfileByUsername", {
        error: error instanceof Error ? error.message : String(error)
      })
      if (error && typeof error === "object" && "statusCode" in error) {
        throw error
      }
      throw createError({ statusCode: 500, statusMessage: "Internal server error" })
    }
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" })
})
