import { supabase } from "@dishola/supabase/admin"
import { setHeader } from "h3"

interface UserTasteRequest {
  tasteIds: number[]
}

interface UserTasteReorderRequest {
  reorderedTastes: Array<{
    id: number
    order_position: number
  }>
}

export default defineEventHandler(async (event) => {
  // CORS headers
  setHeader(
    event,
    "Access-Control-Allow-Origin",  
    process.env.NODE_ENV === "production" ? "https://dishola.com" : "http://localhost:3000"
  )
  setHeader(event, "Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
  setHeader(event, "Access-Control-Allow-Headers", "Content-Type, Authorization")
  
  if (event.method === "OPTIONS") {
    return new Response(null, { status: 204 })
  }

  // Get user from Authorization header
  const authHeader = getHeader(event, "authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing or invalid authorization header"
    })
  }

  const token = authHeader.split(" ")[1]
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  
  if (authError || !user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid authentication token"
    })
  }

  const userId = user.id

  try {
    if (event.method === "GET") {
      // Get user's tastes with dictionary info
      const { data, error } = await supabase
        .from("user_tastes")
        .select(`
          id,
          order_position,
          taste_dictionary:taste_dictionary_id (
            id,
            name,
            type,
            image_url
          )
        `)
        .eq("user_id", userId)
        .order("order_position")

      if (error) {
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to fetch user tastes"
        })
      }

      return {
        tastes: data || []
      }
    }

    if (event.method === "POST") {
      // Add new tastes for user
      const body = await readBody(event) as UserTasteRequest
      
      if (!body.tasteIds || !Array.isArray(body.tasteIds)) {
        throw createError({
          statusCode: 400,
          statusMessage: "tasteIds array is required"
        })
      }

      // Get current max order position
      const { data: maxOrder } = await supabase
        .from("user_tastes")
        .select("order_position")
        .eq("user_id", userId)
        .order("order_position", { ascending: false })
        .limit(1)

      let nextOrderPosition = (maxOrder?.[0]?.order_position || 0) + 1

      // Insert new tastes
      const insertData = body.tasteIds.map(tasteId => ({
        user_id: userId,
        taste_dictionary_id: tasteId,
        order_position: nextOrderPosition++
      }))

      const { data, error } = await supabase
        .from("user_tastes")
        .insert(insertData)
        .select(`
          id,
          order_position,
          taste_dictionary:taste_dictionary_id (
            id,
            name,
            type,
            image_url
          )
        `)

      if (error) {
        throw createError({
          statusCode: 500,
          statusMessage: "Failed to add user tastes"
        })
      }

      return {
        tastes: data
      }
    }

    if (event.method === "PUT") {
      // Reorder user tastes
      const body = await readBody(event) as UserTasteReorderRequest
      
      if (!body.reorderedTastes || !Array.isArray(body.reorderedTastes)) {
        throw createError({
          statusCode: 400,
          statusMessage: "reorderedTastes array is required"
        })
      }

      // Update order positions in batch
      const updates = body.reorderedTastes.map(taste => 
        supabase
          .from("user_tastes")
          .update({ order_position: taste.order_position })
          .eq("id", taste.id)
          .eq("user_id", userId) // ensure user owns the taste
      )

      await Promise.all(updates)

      return { success: true }
    }

    if (event.method === "DELETE") {
      // Delete specific taste or all tastes
      const query = getQuery(event)
      const tasteId = query.id as string

      if (tasteId) {
        // Delete specific taste
        const { error } = await supabase
          .from("user_tastes")
          .delete()
          .eq("id", parseInt(tasteId))
          .eq("user_id", userId)

        if (error) {
          throw createError({
            statusCode: 500,
            statusMessage: "Failed to delete user taste"
          })
        }
      } else {
        // Delete all user tastes
        const { error } = await supabase
          .from("user_tastes")
          .delete()
          .eq("user_id", userId)

        if (error) {
          throw createError({
            statusCode: 500,
            statusMessage: "Failed to delete user tastes"
          })
        }
      }

      return { success: true }
    }

    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed"
    })

  } catch (error) {
    console.error("User tastes API error:", error)
    if (error.statusCode) {
      throw error // Re-throw HTTP errors as-is
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Internal server error"
    })
  }
})