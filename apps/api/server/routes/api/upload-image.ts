import { supabase } from "@dishola/supabase/admin"
import { put } from "@vercel/blob"
import { createError, defineEventHandler, getHeader, readBody } from "h3"
import { createLogger } from "../../lib/logger"
import { setCorsHeaders } from "../../lib/cors"

// Admin emails that can access this endpoint
const ADMIN_EMAILS = ["elsigh@gmail.com"]

interface UploadImageRequest {
  imageUrl: string
  filename: string
}

export default defineEventHandler(async (event) => {
  const logger = createLogger({ event, handlerName: "upload-image" })
  // Handle CORS
  const corsResponse = setCorsHeaders(event, { methods: ["POST", "OPTIONS"] })
  if (corsResponse) return corsResponse

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

  if (event.method === "POST") {
    const body = (await readBody(event)) as UploadImageRequest

    if (!body.imageUrl || !body.filename) {
      throw createError({
        statusCode: 400,
        statusMessage: "imageUrl and filename are required"
      })
    }

    try {
      // Download the image from the URL
      logger.info("Downloading image from URL", { imageUrl: body.imageUrl })
      const imageResponse = await fetch(body.imageUrl)

      if (!imageResponse.ok) {
        throw createError({
          statusCode: 400,
          statusMessage: "Failed to download image from URL"
        })
      }

      // Get the image buffer
      const imageBuffer = await imageResponse.arrayBuffer()
      const contentType = imageResponse.headers.get("content-type") || "image/jpeg"

      // Generate a unique filename
      const timestamp = Date.now()
      const extension = contentType.split("/")[1] || "jpg"
      const uniqueFilename = `taste-${body.filename}-${timestamp}.${extension}`

      logger.info("Uploading to Vercel Blob", { filename: uniqueFilename, contentType })

      // Upload to Vercel Blob
      const blob = await put(uniqueFilename, imageBuffer, {
        access: "public",
        contentType,
        addRandomSuffix: true
      })

      logger.info("Successfully uploaded to Blob", { blobUrl: blob.url, filename: uniqueFilename })

      return {
        success: true,
        blobUrl: blob.url,
        originalUrl: body.imageUrl,
        filename: uniqueFilename
      }
    } catch (error: unknown) {
      logger.error("Error uploading image to blob", { error: error instanceof Error ? error.message : String(error) })

      if (error && typeof error === "object" && "statusCode" in error) {
        throw error
      }

      throw createError({
        statusCode: 500,
        statusMessage: "Failed to upload image to blob storage"
      })
    }
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed"
  })
})
