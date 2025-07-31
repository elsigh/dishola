import type { TasteType } from "@dishola/types/constants"
import { cache } from "react"
import { API_BASE_URL } from "@/lib/constants"

// Define types for taste data
export interface TasteDictionaryItem {
  id: number
  name: string
  type: TasteType
  image_url?: string
}

export interface UserTaste {
  id: number
  order_position: number
  taste_dictionary: TasteDictionaryItem
}

export interface UserTastesResponse {
  tastes: UserTaste[]
}

// Cache the tastes fetch function
export const getUserTastes = cache(async (accessToken: string): Promise<UserTastesResponse> => {
  try {
    const url = `${API_BASE_URL}/api/tastes/user`
    console.debug("Fetching user tastes from", url)
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (res.ok) {
      return (await res.json()) as UserTastesResponse
    }

    throw new Error(`Failed to fetch user tastes: ${res.status}`)
  } catch (error) {
    console.error("Error fetching user tastes:", error)
    throw error
  }
})
