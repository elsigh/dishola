import { supabase } from "@dishola/supabase/admin"
import { createError, defineEventHandler, getHeader, type H3Event, setHeader } from "h3"
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
  setHeader(event, "Access-Control-Allow-Methods", "POST,OPTIONS")
  setHeader(event, "Access-Control-Allow-Headers", "Content-Type, Authorization")
  
  if (event.method === "OPTIONS") {
    return new Response(null, { status: 204 })
  }

  if (event.method !== "POST") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed"
    })
  }

  // Validate admin authentication
  const user = await validateAdminAuth(event)

  try {
    // Get initial cache sizes for reporting
    const initialSearchCacheSize = searchCache.getStats().size
    const initialImageCacheSize = imageCache.getStats().size

    // Clear search cache
    searchCache.clear()

    // Clear image cache
    imageCache.clear()

    const message = `Cleared ${initialSearchCacheSize} search cache entries and ${initialImageCacheSize} image cache entries`
    
    console.log(`Admin cache clear by ${user.email}: ${message}`)

    return {
      success: true,
      message,
      clearedBy: user.email,
      timestamp: new Date().toISOString(),
      cleared: {
        searchCache: initialSearchCacheSize,
        imageCache: initialImageCacheSize
      }
    }
  } catch (error) {
    console.error("Error clearing caches:", error)
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to clear caches"
    })
  }
})