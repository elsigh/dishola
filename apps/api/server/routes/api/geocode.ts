import { createError, defineEventHandler, getQuery, setHeader } from "h3"
import { getNeighborhoodInfo } from "../../lib/location-utils"
import { createLogger } from "../../lib/logger"

export default defineEventHandler(async (event) => {
  const logger = createLogger(event, 'geocode')
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