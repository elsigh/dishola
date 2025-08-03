import { supabase } from "@dishola/supabase/admin"
import { type H3Event, setHeader } from "h3"
import { imageCache } from "../../../../lib/imageCache"
import { searchCache } from "../../../../lib/searchCache"

const ADMIN_EMAILS = ["elsigh@gmail.com"]

async function validateAdminAuth(event: H3Event) {
  const authHeader = getHeader(event, "authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing or invalid authorization header"
    })
  }

  const token = authHeader.substring(7)
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
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
    console.error("Admin auth validation error:", error)
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication failed"
    })
  }
}

export default defineEventHandler(async (event) => {
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
    console.error("Error getting cache stats:", error)
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to get cache statistics"
    })
  }
})