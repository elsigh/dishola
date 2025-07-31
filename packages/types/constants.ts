// Shared constants for Dishola

// Taste Dictionary Types
export const TASTE_TYPES = ["dish", "ingredient", "cuisine"] as const
export type TasteType = (typeof TASTE_TYPES)[number]

// Cuisine options
export const CUISINES = [
  "American",
  "Italian",
  "Chinese",
  "Japanese",
  "Mexican",
  "Indian",
  "Thai",
  "French",
  "Mediterranean",
  "Korean",
  "Vietnamese",
  "Greek",
  "Spanish",
  "Lebanese",
  "Turkish",
  "Ethiopian",
  "Moroccan",
  "Brazilian",
  "Peruvian",
  "German",
  "British",
  "Russian",
  "Other"
] as const
export type Cuisine = (typeof CUISINES)[number]

// Dish categories
export const CATEGORIES = [
  "Appetizer",
  "Main Course",
  "Dessert",
  "Soup",
  "Salad",
  "Sandwich",
  "Pizza",
  "Pasta",
  "Burger",
  "Seafood",
  "Vegetarian",
  "Vegan",
  "Breakfast",
  "Brunch",
  "Snack",
  "Beverage",
  "Cocktail",
  "Other"
] as const
export type Category = (typeof CATEGORIES)[number]

// Price ranges
export const PRICE_RANGES = [
  { value: 1, label: "$ - Under $15", description: "Budget-friendly" },
  { value: 2, label: "$$ - $15-30", description: "Moderate" },
  { value: 3, label: "$$$ - $30-60", description: "Upscale" },
  { value: 4, label: "$$$$ - $60+", description: "Fine dining" }
] as const
