import { getNeighborhoodInfo } from "../../lib/location-utils"

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  
  const lat = typeof query.lat === "string" ? query.lat : Array.isArray(query.lat) ? query.lat[0] : undefined
  const lng = typeof query.lng === "string" ? query.lng : Array.isArray(query.lng) ? query.lng[0] : undefined
  
  if (!lat || !lng) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required parameters: lat and lng"
    })
  }

  try {
    const locationInfo = await getNeighborhoodInfo(lat, lng, event.headers)
    return {
      neighborhood: locationInfo.neighborhood,
      city: locationInfo.city,
      displayName: locationInfo.displayName
    }
  } catch (error) {
    console.error("Location info error:", error)
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to get location information"
    })
  }
})