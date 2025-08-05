import { supabase } from "@dishola/supabase/admin"
import { createError, defineEventHandler, getHeader, getQuery, setHeader } from "h3"

// Admin emails that can access this endpoint
const ADMIN_EMAILS = ["elsigh@gmail.com"]

interface ImageResult {
  url: string
  source: "google" | "unsplash"
  thumbnail?: string
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

  // Check for admin authorization
  const authHeader = getHeader(event, "authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing or invalid authorization header"
    })
  }

  const token = authHeader.split(" ")[1]
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid authentication token"
    })
  }

  // Check if user is admin
  const userEmail = user.email?.toLowerCase()
  if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Admin access required"
    })
  }

  if (event.method === "GET") {
    const query = getQuery(event)
    const searchTerm = query.q as string

    if (!searchTerm) {
      throw createError({
        statusCode: 400,
        statusMessage: "Search term 'q' is required"
      })
    }

    try {
      const images: ImageResult[] = []

      // Get Google Custom Search images
      const googleApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
      const googleCx = process.env.GOOGLE_CUSTOM_SEARCH_CX

      if (googleApiKey && googleCx) {
        try {
          const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${encodeURIComponent(searchTerm)}&searchType=image&num=6`
          const googleRes = await fetch(googleUrl)

          if (googleRes.ok) {
            const googleData = await googleRes.json()
            if (googleData.items && googleData.items.length > 0) {
              for (const item of googleData.items) {
                images.push({
                  url: item.link,
                  source: "google",
                  thumbnail: item.image?.thumbnailLink
                })
              }
            }
          }
        } catch (error) {
          console.error("Google image search error:", error)
        }
      }

      // Get Unsplash images
      const unsplashKey = process.env.UNSPLASH_ACCESS_KEY
      if (unsplashKey) {
        try {
          const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchTerm)}&per_page=6&client_id=${unsplashKey}`
          const unsplashRes = await fetch(unsplashUrl)

          if (unsplashRes.ok) {
            const unsplashData = await unsplashRes.json()
            if (unsplashData.results && unsplashData.results.length > 0) {
              for (const photo of unsplashData.results) {
                images.push({
                  url: photo.urls.regular,
                  source: "unsplash",
                  thumbnail: photo.urls.thumb
                })
              }
            }
          }
        } catch (error) {
          console.error("Unsplash image search error:", error)
        }
      }

      return {
        query: searchTerm,
        images
      }
    } catch (error) {
      console.error("Image search error:", error)
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to search for images"
      })
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed"
  })
})
