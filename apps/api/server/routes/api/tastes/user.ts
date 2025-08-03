import { createClient } from "@supabase/supabase-js"
import { createError, getHeader, getQuery, readBody, setHeader } from "h3"

interface UserTasteRequest {
  tasteIds: number[]
}

interface UserTasteReorderRequest {
  reorderedTastes: Array<{
    id: number
    order_position: number
  }>
}

import type { TasteType } from "@dishola/types/constants"

interface CreateTasteRequest {
  name: string
  type: TasteType
  image_url?: string
  addToProfile?: boolean // Whether to also add to user's profile
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

  // Create Supabase client with user's token
  // biome-ignore lint/style/noNonNullAssertion: zerofux
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })

  // Validate the user token
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

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
      const body = (await readBody(event)) as any
      if (body && body.action === "createTaste") {
        const { name, type, image_url, addToProfile } = body as CreateTasteRequest
        if (!name || !type) {
          throw createError({
            statusCode: 400,
            statusMessage: "name and type are required"
          })
        }
        if (!["dish", "ingredient", "cuisine"].includes(type)) {
          throw createError({
            statusCode: 400,
            statusMessage: "type must be 'dish', 'ingredient', or 'cuisine'"
          })
        }
        // Insert into taste_dictionary
        const { data: tasteData, error: tasteError } = await supabase
          .from("taste_dictionary")
          .insert([
            {
              name: name.trim(),
              type,
              image_url,
              image_source: "user",
              creator_id: userId
            }
          ])
          .select()
        if (tasteError) {
          if (tasteError.code === "23505") {
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
        const newTaste = tasteData[0]
        let userTaste = null
        if (addToProfile) {
          // Add to user's tastes
          // Get current max order position
          const { data: maxOrder } = await supabase
            .from("user_tastes")
            .select("order_position")
            .eq("user_id", userId)
            .order("order_position", { ascending: false })
            .limit(1)
          const nextOrderPosition = (maxOrder?.[0]?.order_position || 0) + 1
          const { data: userTasteData } = await supabase
            .from("user_tastes")
            .insert([
              {
                user_id: userId,
                taste_dictionary_id: newTaste.id,
                order_position: nextOrderPosition
              }
            ])
            .select()
          userTaste = userTasteData?.[0] || null
        }
        return {
          taste: newTaste,
          userTaste
        }
      }
      // Add new tastes for user
      if (body.tasteIds && Array.isArray(body.tasteIds)) {
        // Get current max order position
        const { data: maxOrder } = await supabase
          .from("user_tastes")
          .select("order_position")
          .eq("user_id", userId)
          .order("order_position", { ascending: false })
          .limit(1)

        let nextOrderPosition = (maxOrder?.[0]?.order_position || 0) + 1

        // Insert new tastes
        const insertData = body.tasteIds.map((tasteId) => ({
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
    }

    if (event.method === "PUT") {
      // Reorder user tastes
      const body = (await readBody(event)) as UserTasteReorderRequest

      if (!body.reorderedTastes || !Array.isArray(body.reorderedTastes)) {
        throw createError({
          statusCode: 400,
          statusMessage: "reorderedTastes array is required"
        })
      }

      // Update order positions in batch
      const updates = body.reorderedTastes.map(
        (taste) =>
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
        const { error } = await supabase.from("user_tastes").delete().eq("id", parseInt(tasteId)).eq("user_id", userId)

        if (error) {
          throw createError({
            statusCode: 500,
            statusMessage: "Failed to delete user taste"
          })
        }
      } else {
        // Delete all user tastes
        const { error } = await supabase.from("user_tastes").delete().eq("user_id", userId)

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
