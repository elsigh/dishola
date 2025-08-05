import { createClient } from "@supabase/supabase-js"
import { createError, defineEventHandler, setHeader } from "h3"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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
      console.error("Database error:", error)
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
    console.error("Error fetching cities:", error)
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error"
    })
  }
})
