import { supabase } from "@dishola/supabase/admin"
import { setHeader } from "h3"
import { googleImageSearch } from "../../../lib/googleImageSearch"
import { unsplashImageSearch } from "../../../lib/unsplashImageSearch"

// Admin emails that can access this endpoint
const ADMIN_EMAILS = ['elsigh@gmail.com']

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

  // Check for admin authorization
  const authHeader = getHeader(event, "authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing or invalid authorization header"
    })
  }

  const token = authHeader.split(" ")[1]
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
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

  try {
    // Get taste dictionary items that don't have images yet
    const { data: tastes, error } = await supabase
      .from("taste_dictionary")
      .select("id, name, type")
      .is("image_url", null)
      .limit(20) // Process in batches to avoid rate limiting

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch taste dictionary items"
      })
    }

    if (!tastes || tastes.length === 0) {
      return {
        message: "No items without images found",
        processed: 0
      }
    }

    const googleApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
    const googleCx = process.env.GOOGLE_CUSTOM_SEARCH_CX
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY

    let processed = 0
    const results = []

    for (const taste of tastes) {
      try {
        let imageUrl: string | null = null
        let imageSource: string | null = null

        // Try Google Custom Search first
        if (googleApiKey && googleCx) {
          imageUrl = await googleImageSearch(taste.name, googleApiKey, googleCx)
          if (imageUrl) {
            imageSource = "google"
          }
        }

        // Fallback to Unsplash if Google fails
        if (!imageUrl && unsplashKey) {
          imageUrl = await unsplashImageSearch(taste.name, unsplashKey)
          if (imageUrl) {
            imageSource = "unsplash"
          }
        }

        if (imageUrl && imageSource) {
          // Update the database with the found image
          const { error: updateError } = await supabase
            .from("taste_dictionary")
            .update({ 
              image_url: imageUrl,
              image_source: imageSource,
              updated_at: new Date().toISOString()
            })
            .eq("id", taste.id)

          if (updateError) {
            console.error(`Failed to update image for ${taste.name}:`, updateError)
            results.push({
              id: taste.id,
              name: taste.name,
              success: false,
              error: "Database update failed"
            })
          } else {
            console.log(`✓ Found image for ${taste.name} via ${imageSource}`)
            results.push({
              id: taste.id,
              name: taste.name,
              success: true,
              imageUrl,
              imageSource
            })
            processed++
          }
        } else {
          console.log(`✗ No image found for ${taste.name}`)
          results.push({
            id: taste.id,
            name: taste.name,
            success: false,
            error: "No image found"
          })
        }

        // Rate limiting: wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 200))

      } catch (error) {
        console.error(`Error processing ${taste.name}:`, error)
        results.push({
          id: taste.id,
          name: taste.name,
          success: false,
          error: error.message || "Unknown error"
        })
      }
    }

    return {
      message: `Processed ${processed} out of ${tastes.length} items`,
      processed,
      total: tastes.length,
      results
    }

  } catch (error) {
    console.error("Error populating taste images:", error)
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to populate taste images"
    })
  }
})