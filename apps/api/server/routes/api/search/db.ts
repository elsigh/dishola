import { supabase } from "@dishola/supabase/admin"
import { createError, defineEventHandler, getQuery, type H3Event } from "h3"
import type { DishRecommendation, Location } from "../../../../lib/types"
import { setCorsHeaders } from "../../../lib/cors"
import { createLogger } from "../../../lib/logger"

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: string, lon1: string, lat2: string, lon2: string): number {
  const toRad = (value: number) => (value * Math.PI) / 180

  const lat1Num = parseFloat(lat1)
  const lon1Num = parseFloat(lon1)
  const lat2Num = parseFloat(lat2)
  const lon2Num = parseFloat(lon2)

  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2Num - lat1Num)
  const dLon = toRad(lon2Num - lon1Num)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1Num)) * Math.cos(toRad(lat2Num)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return Math.round(distance * 10) / 10 // Round to 1 decimal place
}

// Deduplicate results based on dish name + restaurant name
function deduplicateResults(results: DishRecommendation[]): DishRecommendation[] {
  const seen = new Set<string>()
  return results.filter((result) => {
    const key = `${result.dish.name.toLowerCase().trim()}-${result.restaurant.name.toLowerCase().trim()}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

async function getDbDishRecommendations(
  dishName: string,
  userLocation: Location,
  sortBy: string = "distance",
  logger: ReturnType<typeof createLogger>
): Promise<DishRecommendation[]> {
  const { data, error } = await supabase
    .from("dishes")
    .select(
      `id,name,vote_avg,vote_count,
      restaurant:restaurants(id,name,address_line1,city,state,latitude,longitude)`
    )
    .ilike("name", `%${dishName}%`)
    .limit(50) // Get more results to sort and filter down to 15

  if (error) {
    logger.error("Database search error", { error })
    return []
  }

  // Map results and calculate distances
  const resultsWithDistance = (data || []).map((rec: any, idx: number) => {
    const restaurantAddrParts = [rec.restaurant?.address_line1, rec.restaurant?.city, rec.restaurant?.state].filter(
      Boolean
    )

    const hasCoordinates = rec.restaurant?.latitude && rec.restaurant?.longitude
    const distance = hasCoordinates
      ? calculateDistance(
          userLocation.lat,
          userLocation.long,
          String(rec.restaurant.latitude),
          String(rec.restaurant.longitude)
        )
      : 999 // Set high distance for restaurants without coordinates

    return {
      id: `${rec.name.replace(/\s+/g, "_")}-${rec.restaurant?.name.replace(/\s+/g, "_")}-${idx}`,
      dish: {
        name: rec.name,
        description: "",
        rating: rec.vote_avg ? (Number(rec.vote_avg) / 2).toFixed(1) : "0"
      },
      restaurant: {
        name: rec.restaurant?.name,
        address: restaurantAddrParts.join(", "),
        lat: rec.restaurant?.latitude ? String(rec.restaurant.latitude) : "",
        lng: rec.restaurant?.longitude ? String(rec.restaurant.longitude) : "",
        website: ""
      },
      distance,
      vote_avg: rec.vote_avg || 0
    }
  })

  // Filter out results > 75 miles away
  const filteredResults = resultsWithDistance.filter((result) => result.distance <= 75)

  // Sort based on user preference
  const sortedResults = filteredResults.sort((a, b) => {
    if (sortBy === "rating") {
      // Sort by rating first, then by distance
      const ratingDiff = b.vote_avg - a.vote_avg
      if (Math.abs(ratingDiff) > 0.1) return ratingDiff
      return a.distance - b.distance
    } else {
      // Sort by distance first, then by rating
      const distanceDiff = a.distance - b.distance
      if (Math.abs(distanceDiff) > 0.1) return distanceDiff
      return b.vote_avg - a.vote_avg
    }
  })

  // Return top 15 results, converting distance to formatted string
  return sortedResults.slice(0, 15).map(({ vote_avg, distance, ...result }) => ({
    ...result,
    distance: `${distance.toFixed(1)} mi`
  }))
}

export default defineEventHandler(async (event) => {
  const logger = createLogger({ event, handlerName: "search/db" })

  // Handle CORS
  const corsResponse = setCorsHeaders(event, { methods: ["GET", "OPTIONS"] })
  if (corsResponse) return corsResponse

  // Location fallback logic
  function getLocationFromRequest(event: H3Event) {
    const query = getQuery(event)
    // 1. Use query params if present
    const lat = typeof query.lat === "string" ? query.lat : Array.isArray(query.lat) ? query.lat[0] : undefined
    const long = typeof query.long === "string" ? query.long : Array.isArray(query.long) ? query.long[0] : undefined
    if (lat && long) {
      return {
        lat,
        long,
        address: typeof query.address === "string" ? query.address : ""
      }
    }
    // 2. Try Vercel headers
    const headers = event.node.req.headers
    const headerLat = headers["x-vercel-ip-latitude"]
    const headerLong = headers["x-vercel-ip-longitude"]
    const city = headers["x-vercel-ip-city"]
    const region = headers["x-vercel-ip-country-region"]
    const country = headers["x-vercel-ip-country"]
    if (headerLat && headerLong) {
      return {
        lat: headerLat,
        long: headerLong,
        address: [city, region, country]
          .map((h) => (h ? decodeURIComponent(Array.isArray(h) ? h[0] : h) : h))
          .filter(Boolean)
          .join(", ")
      }
    }
    // 3. Fallback to Vercel HQ
    return {
      lat: "37.7897",
      long: "-122.3942",
      address: "100 First St, San Francisco, CA"
    }
  }

  const query = getQuery(event)
  const locationInfo = getLocationFromRequest(event)

  // Get sort parameter (default to distance)
  const sortBy = typeof query.sort === "string" ? query.sort : "distance"

  // Validate that we have a dish name parameter
  if (!query.dish) {
    logger.error("Database search API error: Missing dish parameter", { dish: query.dish })
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required parameter: 'dish' is required"
    })
  }

  try {
    const dishName = query.dish as string

    logger.info("Fetching database results", { dish: dishName, sortBy, location: locationInfo })

    // Get database results
    const dbResults = await getDbDishRecommendations(dishName, locationInfo, sortBy, logger)

    // Deduplicate results
    const deduplicatedResults = deduplicateResults(dbResults)

    logger.info("Database search completed", {
      resultsCount: deduplicatedResults.length,
      dish: dishName
    })

    return {
      results: deduplicatedResults,
      query: dishName,
      location: locationInfo.address || `${locationInfo.lat},${locationInfo.long}`,
      sortBy
    }
  } catch (error) {
    logger.error("Database search error", { error })
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to search database for dishes"
    })
  }
})
