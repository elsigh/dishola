// Import shared types from the types package
export type {
  AddTasteDictionaryItemRequest,
  CreateTasteRequest,
  Dish,
  DishDetailResponse,
  DishImage,
  DishRecommendation,
  ImageResult,
  Location,
  // Search and AI types
  ParsedQuery,
  Profile,
  // API response types
  ProfileResponse,
  // API request types
  ProfileUpdateRequest,
  PublicProfileResponse,
  Restaurant,
  Review,
  TasteAutocompleteResponse,
  TasteDictionary,
  TasteDictionaryStatsResponse,
  UploadImageRequest,
  // Database table types
  User,
  UserTaste,
  UserTasteReorderRequest,
  UserTasteRequest,
  UserTastesResponse
} from "@dishola/types"

// Re-export schemas for validation
export {
  CreateTasteRequestSchema,
  DishRecommendationSchema,
  LocationSchema,
  ParsedQuerySchema,
  ProfileResponseSchema,
  ProfileUpdateRequestSchema,
  UserTasteRequestSchema
} from "@dishola/types"
