import { supabase } from "@dishola/supabase/admin"
import { createError, defineEventHandler, getHeader, type H3Event, setHeader } from "h3"
import { createLogger } from "../../../../lib/logger"
import { imageCache } from "../../../../lib/imageCache"
import { searchCache } from "../../../../lib/searchCache"

const ADMIN_EMAILS = ["elsigh@gmail.com"]

async function validateAdminAuth(event: H3Event) {
  const logger = createLogger(event, "admin-auth-validation")
  const authHeader = getHeader(event, "authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing or invalid authorization header"
    })
  }

  const token = authHeader.substring(7)

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token)

    if (error || !user?.email) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid authentication token"
      })
    }

    if (!ADMIN_EMAILS.includes(user.email)) {
      throw createError({
        statusCode: 403,
        statusMessage: "Admin access required"
      })
    }

    return user
  } catch (error) {
    logger.error("Admin auth validation failed", { error })
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication failed"
    })
  }
}

export default defineEventHandler(async (event) => {
  const logger = createLogger(event, "admin-cache-stats")

  // CORS headers
  setHeader(
    event,
    "Access-Control-Allow-Origin",
    process.env.NODE_ENV === "production" ? "https://dishola.com" : "http://localhost:3000"
  )
  setHeader(event, "Access-Control-Allow-Methods", "GET,OPTIONS")
  setHeader(event, "Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (event.method === "OPTIONS") {
    return new Response(null, { status: 204 })
  }

  // Validate admin authentication
  await validateAdminAuth(event)

  try {
    // Get cache statistics
    const searchCacheStats = searchCache.getStats()
    const imageCacheStats = imageCache.getStats()

    return {
      searchCache: searchCacheStats,
      imageCache: imageCacheStats,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error("Failed to get cache statistics", { error })
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to get cache statistics"
    })
  }
})
