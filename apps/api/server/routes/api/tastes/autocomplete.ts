import { supabase } from "@dishola/supabase/admin"
import type { TasteType } from "@dishola/types/constants"
import { createError, defineEventHandler, getQuery } from "h3"
import { createLogger } from "../../../lib/logger"
import { setCorsHeaders } from "../../../lib/cors"

export default defineEventHandler(async (event) => {
  const logger = createLogger({ event, handlerName: "tastes-autocomplete" })

  // Handle CORS
  const corsResponse = setCorsHeaders(event, { methods: ["GET", "OPTIONS"] })
  if (corsResponse) return corsResponse

  const query = getQuery(event)
  const searchTerm = query.q as string
  const type = query.type as TasteType | undefined // 'dish', 'ingredient', 'cuisine', or undefined for all

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
    if (type && ["dish", "ingredient", "cuisine"].includes(type)) {
      dbQuery = dbQuery.eq("type", type)
    }

    const { data, error } = await dbQuery

    if (error) {
      logger.error("Database query failed", { error, searchTerm, type })
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to fetch autocomplete suggestions"
      })
    }

    return {
      results: data || []
    }
  } catch (error) {
    logger.error("Autocomplete request failed", { error, searchTerm, type })
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch autocomplete suggestions"
    })
  }
})
