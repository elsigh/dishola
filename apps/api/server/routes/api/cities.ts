import { createClient } from "@supabase/supabase-js"
import { createError, defineEventHandler } from "h3"
import { createLogger } from "../../lib/logger"
import { setCorsHeaders } from "../../lib/cors"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export default defineEventHandler(async (event) => {
  const logger = createLogger({ event, handlerName: "cities" })

  // Handle CORS
  const corsResponse = setCorsHeaders(event, { methods: ["GET", "OPTIONS"] })
  if (corsResponse) return corsResponse

  try {
    // Query to get cities with dish counts
    // We'll get cities from restaurants that have dishes, and count the dishes
    const { data, error } = await supabase
      .from("restaurants")
      .select(`
        city,
        dishes!inner(id)
      `)
      .not("city", "is", null)
      .not("city", "eq", "")

    if (error) {
      logger.error("Database error", { error })
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch cities"
      })
    }

    // Process the data to group by city and count dishes
    const cityMap = new Map<string, number>()

    data?.forEach((restaurant) => {
      const city = restaurant.city?.trim()
      if (city) {
        const dishCount = restaurant.dishes?.length || 0
        cityMap.set(city, (cityMap.get(city) || 0) + dishCount)
      }
    })

    // Convert to array and sort by dish count (descending)
    const cities = Array.from(cityMap.entries())
      .map(([city, dishCount]) => ({ city, dishCount }))
      .sort((a, b) => b.dishCount - a.dishCount)
      .filter((item) => item.dishCount > 0) // Only show cities with dishes

    return { cities }
  } catch (error) {
    logger.error("Error fetching cities", { error })
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error"
    })
  }
})
