import { supabase } from "@dishola/supabase/admin"
import { setHeader } from "h3"

// Admin emails that can access this endpoint
const ADMIN_EMAILS = ["elsigh@gmail.com"]

interface AddItemRequest {
  name: string
  type: "dish" | "ingredient"
  image_url?: string
}

export default defineEventHandler(async (event) => {
  // CORS headers
  setHeader(
    event,
    "Access-Control-Allow-Origin",
    process.env.NODE_ENV === "production" ? "https://dishola.com" : "http://localhost:3000"
  )
  setHeader(event, "Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
  setHeader(event, "Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (event.method === "OPTIONS") {
    return new Response(null, { status: 204 })
  }

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

  try {
    if (event.method === "GET") {
      const query = getQuery(event)

      // Handle stats request
      if (query.action === "stats") {
        const { data, error } = await supabase.from("taste_dictionary").select("type, image_url, search_count")

        if (error) {
          throw createError({
            statusCode: 500,
            statusMessage: "Failed to fetch taste dictionary stats"
          })
        }

        const stats = {
          total: data.length,
          dishes: data.filter((item) => item.type === "dish").length,
          ingredients: data.filter((item) => item.type === "ingredient").length,
          withImages: data.filter((item) => item.image_url).length,
          withoutImages: data.filter((item) => !item.image_url).length,
          totalSearches: data.reduce((sum, item) => sum + (item.search_count || 0), 0)
        }

        return { stats }
      }

      // Handle items request (existing functionality)
      const searchTerm = query.search as string
      const typeFilter = query.type as string

      let dbQuery = supabase
        .from("taste_dictionary")
        .select("*")
        .order("search_count", { ascending: false })
        .order("name")
        .limit(100)

      if (typeFilter && (typeFilter === "dish" || typeFilter === "ingredient")) {
        dbQuery = dbQuery.eq("type", typeFilter)
      }

      if (searchTerm) {
        dbQuery = dbQuery.ilike("name", `%${searchTerm}%`)
      }

      const { data, error } = await dbQuery

      if (error) {
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to fetch taste dictionary items"
        })
      }

      return {
        items: data || []
      }
    }

    if (event.method === "POST") {
      // Add new taste dictionary item
      const body = (await readBody(event)) as AddItemRequest

      if (!body.name || !body.type) {
        throw createError({
          statusCode: 400,
          statusMessage: "name and type are required"
        })
      }

      if (!["dish", "ingredient"].includes(body.type)) {
        throw createError({
          statusCode: 400,
          statusMessage: "type must be 'dish' or 'ingredient'"
        })
      }

      // Prepare the item data
      const itemData: any = {
        name: body.name.trim(),
        type: body.type
      }

      // Add image URL if provided
      if (body.image_url) {
        itemData.image_url = body.image_url
        itemData.image_source = "admin" // Mark as admin-uploaded
      }

      const { data, error } = await supabase.from("taste_dictionary").insert([itemData]).select()

      if (error) {
        if (error.code === "23505") {
          // unique constraint violation
          throw createError({
            statusCode: 409,
            statusMessage: "An item with this name already exists"
          })
        }
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to add taste dictionary item"
        })
      }

      return {
        item: data[0]
      }
    }

    if (event.method === "DELETE") {
      // Delete taste dictionary item
      const query = getQuery(event)
      const itemId = query.id as string

      if (!itemId) {
        throw createError({
          statusCode: 400,
          statusMessage: "id parameter is required"
        })
      }

      const { error } = await supabase.from("taste_dictionary").delete().eq("id", parseInt(itemId))

      if (error) {
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to delete taste dictionary item"
        })
      }

      return { success: true }
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed"
    })
  } catch (error) {
    console.error("Taste dictionary admin API error:", error)
    if (error.statusCode) {
      throw error // Re-throw HTTP errors as-is
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error"
    })
  }
})
