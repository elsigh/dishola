#!/usr/bin/env node

/**
 * Script to find taste dictionary entries without images,
 * search for appropriate images, and update the database.
 *
 * Usage: node populate-taste-images.js [--limit=NUMBER] [--dry-run]
 *
 * Options:
 *   --limit=NUMBER  Limit the number of tastes to process (default: 50)
 *   --dry-run       Don't actually update the database, just show what would be done
 *
 * Setup:
 * 1. Create a .env file in the scripts directory with the following variables:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 *    - GOOGLE_CUSTOM_SEARCH_API_KEY
 *    - GOOGLE_CUSTOM_SEARCH_CX
 *    - UNSPLASH_ACCESS_KEY
 *    - BLOB_READ_WRITE_TOKEN
 *
 * 2. Install dependencies:
 *    cd scripts
 *    npm install
 *
 * 3. Run the script:
 *    node populate-taste-images.js --dry-run  # Test run without making changes
 *    node populate-taste-images.js            # Actually update the database
 *    node populate-taste-images.js --limit=10 # Process only 10 tastes
 */

const { createClient } = require("@supabase/supabase-js")
const { put } = require("@vercel/blob")
const fetch = require("node-fetch")
const dotenv = require("dotenv")

// Load environment variables
dotenv.config()

// Parse command line arguments
const args = process.argv.slice(2)
const limit = parseInt(args.find((arg) => arg.startsWith("--limit="))?.split("=")[1] || "50")
const dryRun = args.includes("--dry-run")

// Supabase client setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  )
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// API keys for image search
const googleApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
const googleCx = process.env.GOOGLE_CUSTOM_SEARCH_CX
const unsplashKey = process.env.UNSPLASH_ACCESS_KEY

if (!googleApiKey || !googleCx) {
  console.warn("Missing Google Custom Search API keys. Will skip Google image search.")
}

if (!unsplashKey) {
  console.warn("Missing Unsplash API key. Will skip Unsplash image search.")
}

/**
 * Search for images using Google Custom Search and Unsplash
 */
async function searchImages(searchTerm) {
  const images = []

  // Get Google Custom Search images
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

  return images
}

/**
 * Upload an image to Vercel Blob
 */
async function uploadImageToBlob(imageUrl, filename) {
  try {
    // Download the image from the URL
    console.log(`Downloading image from: ${imageUrl}`)
    const imageResponse = await fetch(imageUrl)

    if (!imageResponse.ok) {
      throw new Error("Failed to download image from URL")
    }

    // Get the image buffer
    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg"

    // Generate a unique filename
    const timestamp = Date.now()
    const extension = contentType.split("/")[1] || "jpg"
    const uniqueFilename = `taste-${filename}-${timestamp}.${extension}`

    console.log(`Uploading to Vercel Blob: ${uniqueFilename}`)

    if (dryRun) {
      console.log("[DRY RUN] Would upload image to Vercel Blob")
      return {
        url: `https://example.com/dummy-url-for-dry-run/${uniqueFilename}`,
        filename: uniqueFilename
      }
    }

    // Upload to Vercel Blob
    const blob = await put(uniqueFilename, imageBuffer, {
      access: "public",
      contentType,
      addRandomSuffix: true
    })

    console.log(`Successfully uploaded to Blob: ${blob.url}`)

    return {
      url: blob.url,
      filename: uniqueFilename
    }
  } catch (error) {
    console.error("Error uploading image to blob:", error)
    throw error
  }
}

/**
 * Update the taste dictionary entry with the new image URL
 */
async function updateTasteImage(tasteId, imageUrl, source) {
  try {
    if (dryRun) {
      console.log(`[DRY RUN] Would update taste ${tasteId} with image URL: ${imageUrl}`)
      return { success: true }
    }

    const { data, error } = await supabase
      .from("taste_dictionary")
      .update({
        image_url: imageUrl,
        image_source: source,
        updated_at: new Date().toISOString()
      })
      .eq("id", tasteId)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error(`Error updating taste ${tasteId}:`, error)
    return { success: false, error }
  }
}

/**
 * Main function to process tastes without images
 */
async function main() {
  try {
    console.log(`Running in ${dryRun ? "DRY RUN" : "LIVE"} mode`)
    console.log(`Processing up to ${limit} tastes without images`)

    // Get tastes without images
    const { data: tastes, error } = await supabase
      .from("taste_dictionary")
      .select("id, name, type")
      .is("image_url", null)
      .order("id")
      .limit(limit)

    if (error) {
      throw error
    }

    console.log(`Found ${tastes.length} tastes without images`)

    // Process each taste
    let successCount = 0
    let failureCount = 0

    for (const taste of tastes) {
      try {
        console.log(`\nProcessing taste: ${taste.name} (${taste.type}, ID: ${taste.id})`)

        // Search for images with optimized search terms
        let searchTerm
        if (taste.type === "ingredient") {
          searchTerm = `${taste.name} food ingredient`
        } else if (taste.type === "cuisine") {
          searchTerm = `${taste.name} cuisine food traditional`
        } else {
          searchTerm = `${taste.name} ${taste.type}`
        }
        console.log(`Searching for images with term: "${searchTerm}"`)

        const images = await searchImages(searchTerm)

        if (images.length === 0) {
          console.log(`No images found for "${searchTerm}"`)
          failureCount++
          continue
        }

        console.log(`Found ${images.length} images`)

        // Use the first image
        const selectedImage = images[0]
        console.log(`Selected image: ${selectedImage.url} (source: ${selectedImage.source})`)

        // Upload to Vercel Blob
        const sanitizedFilename = taste.name.toLowerCase().replace(/[^a-z0-9]/g, "-")
        const blob = await uploadImageToBlob(selectedImage.url, sanitizedFilename)

        // Update the taste dictionary entry
        const updateResult = await updateTasteImage(taste.id, blob.url, selectedImage.source)

        if (updateResult.success) {
          console.log(`Successfully updated taste ${taste.id} with image URL: ${blob.url}`)
          successCount++
        } else {
          console.error(`Failed to update taste ${taste.id}`)
          failureCount++
        }

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`Error processing taste ${taste.id}:`, error)
        failureCount++
      }
    }

    console.log("\n=== Summary ===")
    console.log(`Total tastes processed: ${tastes.length}`)
    console.log(`Successful updates: ${successCount}`)
    console.log(`Failed updates: ${failureCount}`)

    if (dryRun) {
      console.log("\nThis was a dry run. No changes were made to the database.")
    }
  } catch (error) {
    console.error("Error in main process:", error)
    process.exit(1)
  }
}

// Run the script
main().catch(console.error)
