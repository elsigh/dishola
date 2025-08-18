import { createError, defineEventHandler, getQuery } from "h3"
import { getNeighborhoodInfo } from "../../lib/location-utils"
import { createLogger } from "../../lib/logger"
import { setCorsHeaders } from "../../lib/cors"

export default defineEventHandler(async (event) => {
  const logger = createLogger({ event, handlerName: "geocode" })

  // Handle CORS
  const corsResponse = setCorsHeaders(event, { methods: ["GET", "OPTIONS"] })
  if (corsResponse) return corsResponse

  if (event.method === "GET") {
    const { lat, lng } = getQuery(event)

    if (!lat || !lng || typeof lat !== "string" || typeof lng !== "string") {
      throw createError({ statusCode: 400, statusMessage: "Missing or invalid lat/lng parameters" })
    }

    try {
      const locationInfo = await getNeighborhoodInfo(lat, lng, event.headers)
      return locationInfo
    } catch (error) {
      logger.error("Failed to geocode location", { error })
      throw createError({ statusCode: 500, statusMessage: "Failed to geocode location" })
    }
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" })
})
