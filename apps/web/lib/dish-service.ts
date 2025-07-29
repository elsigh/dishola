import { API_BASE_URL } from "@/lib/constants"

export interface DishImage {
  id: number
  blob_url: string
  original_filename: string
  description?: string
  created_at: string
}

export interface Review {
  id: number
  review: string
  vote: number
  created_at: string
  user: {
    id: number
    name: string
    realname?: string
    image_normal?: string
  }
}

export interface Restaurant {
  id: number
  name: string
  address_line1?: string
  city?: string
  state?: string
  postal_code?: string
  phone?: string
  url?: string
  latitude?: number
  longitude?: number
}

export interface Dish {
  id: number
  name: string
  vote_avg: number
  vote_count: number
  review_count: number
  created_at: string
  updated_at: string
  restaurant: Restaurant
  images: DishImage[]
  reviews: Review[]
}

export async function getDish(dishId: string): Promise<Dish> {
  const apiUrl = `${API_BASE_URL}/api/dish/${dishId}`

  const response = await fetch(apiUrl)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Dish not found: ${dishId}`)
    }
    throw new Error(`Failed to fetch dish: ${response.statusText}`)
  }

  const dish = await response.json()
  return dish
}

export function generateSlug(dishName: string, restaurantName: string): string {
  const dishSlug = dishName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  const restaurantSlug = restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return `${dishSlug}-at-${restaurantSlug}`
}
