import { z } from "zod"
import type { TasteType } from "./constants.js"
import { TASTE_TYPES } from "./constants.js"

// ========================================
// Database Table Types
// ========================================

// Users table
export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  realname: z.string().nullable(),
  email: z.string().email(),
  count_dishes: z.number().default(0),
  count_reviews: z.number().default(0),
  count_photos: z.number().default(0),
  image_normal: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export type User = z.infer<typeof UserSchema>

// Restaurants table
export const RestaurantSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string().nullable(),
  address_line1: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postal_code: z.string().nullable(),
  country: z.string().default("US"),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  phone: z.string().nullable(),
  closed: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export type Restaurant = z.infer<typeof RestaurantSchema>

// Dishes table
export const DishSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  restaurant_id: z.number(),
  name: z.string(),
  disabled: z.boolean().default(false),
  vote_avg: z.number().nullable(),
  vote_count: z.number().default(0),
  last_review_date: z.string().datetime().nullable(),
  review_count: z.number().default(0),
  dish_image_filepath: z.string().nullable(),
  dish_image_created: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export type Dish = z.infer<typeof DishSchema>

// Reviews table
export const ReviewSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  dish_id: z.number(),
  review: z.string(),
  vote: z.number().min(1).max(10),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export type Review = z.infer<typeof ReviewSchema>

// Profiles table (Supabase auth extension)
export const ProfileSchema = z.object({
  user_id: z.string(), // UUID from Supabase auth
  username: z.string().nullable(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

export type Profile = z.infer<typeof ProfileSchema>

// Taste Dictionary table
export const TasteDictionarySchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.enum(TASTE_TYPES),
  image_url: z.string().nullable(),
  image_source: z.string().nullable(),
  creator_id: z.string().nullable(),
  search_count: z.number().default(0),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

export type TasteDictionary = z.infer<typeof TasteDictionarySchema>

// User Tastes table
export const UserTasteSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  taste_dictionary_id: z.number(),
  order_position: z.number(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional()
})

export type UserTaste = z.infer<typeof UserTasteSchema>

// Dish Images table
export const DishImageSchema = z.object({
  id: z.number(),
  dish_id: z.number(),
  blob_url: z.string(),
  original_filename: z.string().nullable(),
  description: z.string().nullable(),
  created_at: z.string().datetime()
})

export type DishImage = z.infer<typeof DishImageSchema>

// ========================================
// API Response Types
// ========================================

// Profile API Response
export const ProfileResponseSchema = z.object({
  id: z.string().optional(),
  email: z.string().email().optional(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  username: z.string().nullable(),
  tastes: z.array(
    z.object({
      id: z.number(),
      order_position: z.number(),
      taste_dictionary: z.object({
        id: z.number(),
        name: z.string(),
        type: z.enum(TASTE_TYPES),
        image_url: z.string().nullable()
      })
    })
  ).optional()
})

export type ProfileResponse = z.infer<typeof ProfileResponseSchema>

// Public Profile API Response
export const PublicProfileResponseSchema = z.object({
  username: z.string(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  tastes: z.array(
    z.object({
      id: z.number(),
      order_position: z.number(),
      taste_dictionary: z.object({
        id: z.number(),
        name: z.string(),
        type: z.enum(TASTE_TYPES),
        image_url: z.string().nullable()
      })
    })
  )
})

export type PublicProfileResponse = z.infer<typeof PublicProfileResponseSchema>

// Dish Detail API Response
export const DishDetailResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  vote_avg: z.number().nullable(),
  vote_count: z.number(),
  review_count: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  restaurants: z.object({
    id: z.number(),
    name: z.string(),
    address_line1: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    postal_code: z.string().nullable(),
    phone: z.string().nullable(),
    url: z.string().nullable(),
    latitude: z.number().nullable(),
    longitude: z.number().nullable()
  }),
  images: z.array(DishImageSchema).optional(),
  reviews: z
    .array(
      z.object({
        id: z.number(),
        review: z.string(),
        vote: z.number(),
        created_at: z.string().datetime(),
        users: z.object({
          id: z.number(),
          name: z.string(),
          realname: z.string().nullable(),
          image_normal: z.string().nullable()
        })
      })
    )
    .optional()
})

export type DishDetailResponse = z.infer<typeof DishDetailResponseSchema>

// User Tastes API Response
export const UserTastesResponseSchema = z.object({
  tastes: z.array(
    z.object({
      id: z.number(),
      order_position: z.number(),
      taste_dictionary: z.object({
        id: z.number(),
        name: z.string(),
        type: z.enum(TASTE_TYPES),
        image_url: z.string().nullable()
      })
    })
  )
})

export type UserTastesResponse = z.infer<typeof UserTastesResponseSchema>

// Taste Autocomplete API Response
export const TasteAutocompleteResponseSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      type: z.enum(["dish", "ingredient"]),
      image_url: z.string().nullable()
    })
  )
})

export type TasteAutocompleteResponse = z.infer<typeof TasteAutocompleteResponseSchema>

// Admin Taste Dictionary Stats Response
export const TasteDictionaryStatsResponseSchema = z.object({
  stats: z.object({
    total: z.number(),
    dishes: z.number(),
    ingredients: z.number(),
    cuisines: z.number(),
    withImages: z.number(),
    withoutImages: z.number(),
    totalSearches: z.number()
  })
})

export type TasteDictionaryStatsResponse = z.infer<typeof TasteDictionaryStatsResponseSchema>

// ========================================
// API Request Types
// ========================================

// Profile Update Request
export const ProfileUpdateRequestSchema = z.object({
  display_name: z.string().optional(),
  username: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .optional()
})

export type ProfileUpdateRequest = z.infer<typeof ProfileUpdateRequestSchema>

// User Taste Request
export const UserTasteRequestSchema = z.object({
  taste_dictionary_id: z.number()
})

export type UserTasteRequest = z.infer<typeof UserTasteRequestSchema>

// User Taste Reorder Request
export const UserTasteReorderRequestSchema = z.object({
  action: z.literal("reorder"),
  taste_ids: z.array(z.number())
})

export type UserTasteReorderRequest = z.infer<typeof UserTasteReorderRequestSchema>

// Create Taste Request
export const CreateTasteRequestSchema = z.object({
  name: z.string(),
  type: z.enum(TASTE_TYPES),
  image_url: z.string().optional(),
  addToProfile: z.boolean().optional()
})

export type CreateTasteRequest = z.infer<typeof CreateTasteRequestSchema>

// Add Taste Dictionary Item Request
export const AddTasteDictionaryItemRequestSchema = z.object({
  name: z.string(),
  type: z.enum(TASTE_TYPES),
  image_url: z.string().optional()
})

export type AddTasteDictionaryItemRequest = z.infer<typeof AddTasteDictionaryItemRequestSchema>

// Upload Image Request
export const UploadImageRequestSchema = z.object({
  dish_id: z.number(),
  description: z.string().optional()
})

export type UploadImageRequest = z.infer<typeof UploadImageRequestSchema>

// ========================================
// Search and AI Types
// ========================================

export const ParsedQuerySchema = z.object({
  dishName: z.string(),
  cuisine: z.string()
})

export type ParsedQuery = z.infer<typeof ParsedQuerySchema>

export const LocationSchema = z.object({
  address: z.string(),
  lat: z.string(),
  long: z.string()
})

export type Location = z.infer<typeof LocationSchema>

export const DishRecommendationSchema = z.object({
  id: z.string().optional(),
  dish: z.object({
    name: z.string(),
    description: z.string(),
    rating: z.string()
  }),
  restaurant: z.object({
    name: z.string(),
    address: z.string(),
    lat: z.string(),
    lng: z.string(),
    website: z.string()
  })
})

export type DishRecommendation = z.infer<typeof DishRecommendationSchema>

export const ImageResultSchema = z.object({
  url: z.string(),
  title: z.string(),
  source: z.string()
})

export type ImageResult = z.infer<typeof ImageResultSchema>
