import { supabase } from "@dishola/supabase/admin"
import { createError, defineEventHandler, getRouterParam, setHeader } from "h3"
import { createLogger } from "../../../lib/logger"

export default defineEventHandler(async (event) => {
  const logger = createLogger(event, "dish-detail")

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

  const dishId = getRouterParam(event, "id")

  if (!dishId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing dish ID"
    })
  }

  try {
    // Get dish with restaurant data
    const { data: dishData, error: dishError } = await supabase
      .from("dishes")
      .select(`
        id,
        name,
        vote_avg,
        vote_count,
        review_count,
        created_at,
        updated_at,
        restaurants (
          id,
          name,
          address_line1,
          city,
          state,
          postal_code,
          phone,
          url,
          latitude,
          longitude
        )
      `)
      .eq("id", dishId)
      .single()

    if (dishError || !dishData) {
      throw createError({
        statusCode: 404,
        statusMessage: `Dish not found: ${dishId}`
      })
    }

    // Get dish images
    const { data: imagesData, error: imagesError } = await supabase
      .from("dish_images")
      .select("id, blob_url, original_filename, description, created_at")
      .eq("dish_id", dishId)
      .order("created_at", { ascending: true })

    if (imagesError) {
      logger.error("Error fetching dish images", { error: imagesError, dishId })
    }

    // Get reviews with user data
    const { data: reviewsData, error: reviewsError } = await supabase
      .from("reviews")
      .select(`
        id,
        review,
        vote,
        created_at,
        users (
          id,
          name,
          realname,
          image_normal
        )
      `)
      .eq("dish_id", dishId)
      .order("created_at", { ascending: false })

    if (reviewsError) {
      logger.error("Error fetching reviews", { error: reviewsError, dishId })
    }

    // Transform the data to match the expected interface
    const dish = {
      id: dishData.id,
      name: dishData.name,
      vote_avg: parseFloat(dishData.vote_avg || "0"),
      vote_count: dishData.vote_count || 0,
      review_count: dishData.review_count || 0,
      created_at: dishData.created_at,
      updated_at: dishData.updated_at,
      restaurant: dishData.restaurants,
      images: imagesData || [],
      reviews: (reviewsData || []).map((review) => ({
        id: review.id,
        review: review.review,
        vote: review.vote,
        created_at: review.created_at,
        user: {
          id: (review.users as any).id,
          name: (review.users as any).name,
          realname: (review.users as any).realname,
          image_normal: (review.users as any).image_normal
        }
      }))
    }

    return dish
  } catch (error: unknown) {
    logger.error("Error fetching dish", { error: error instanceof Error ? error.message : String(error), dishId })
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch dish"
    })
  }
})
