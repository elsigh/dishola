import { supabase } from "@dishola/supabase/admin"
import { createError, getQuery, setHeader } from "h3"

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

  const query = getQuery(event)
  const searchTerm = query.q as string
  const type = query.type as string // 'dish', 'ingredient', or undefined for both

  if (!searchTerm || searchTerm.length < 2) {
    return {
      results: []
    }
  }

  try {
    let dbQuery = supabase
      .from("taste_dictionary")
      .select("id, name, type, image_url")
      .ilike("name", `%${searchTerm}%`)
      .order("name")
      .limit(10)

    // Filter by type if specified
    if (type && (type === "dish" || type === "ingredient")) {
      dbQuery = dbQuery.eq("type", type)
    }

    const { data, error } = await dbQuery

    if (error) {
      console.error("Taste autocomplete error:", error)
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch autocomplete suggestions"
      })
    }

    return {
      results: data || []
    }
  } catch (error) {
    console.error("Autocomplete error:", error)
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch autocomplete suggestions"
    })
  }
})
