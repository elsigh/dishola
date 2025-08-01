import { createGatewayProvider } from "@ai-sdk/gateway"
import { supabase } from "@dishola/supabase/admin"
import { createClient } from "@supabase/supabase-js"
import { get } from "@vercel/edge-config"
import type { LanguageModel } from "ai"
import { generateText } from "ai"
import { type H3Event, setHeader } from "h3"
import type { DishRecommendation, Location, ParsedQuery } from "../../../lib/types"

// Add cache at the top
const SEARCH_CACHE = new Map<string, { data: Record<string, unknown>; timestamp: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
function getCacheKey(q: string, lat: string, long: string, includeTastes: boolean) {
  return JSON.stringify({ q, lat, long, includeTastes })
}

const gateway = createGatewayProvider({
  apiKey: process.env.GATEWAY_API_KEY
})

async function getModel(): Promise<LanguageModel> {
  try {
    // Try to get model from Edge Config
    const configModel = await get("SEARCH_AI_MODEL")
    if (configModel) {
      console.debug(`Using model from Edge Config: ${configModel}`)
      // @ts-ignore
      return gateway(configModel)
    }
  } catch (error) {
    console.warn("Failed to fetch from Edge Config:", error)
  }

  // Fallbacks if Edge Config fails or is not set
  const fallbackModel = "openai/gpt-4-turbo"

  // @ts-ignore
  return gateway(fallbackModel)
}

function getPrompt(dishName: string, location: Location, userTastes: string[] = []) {
  let promptBase = `Return the top 5 best ${dishName} recommendations`

  // If user has tastes, include them in the prompt
  if (userTastes.length > 0) {
    promptBase = `Return the top 5 best ${dishName} recommendations that would appeal to someone who likes ${userTastes.join(", ")}`
  }

  const prompt = `${promptBase}
	as close as possible to (${location.lat}, ${location.long}))
	sorted by closeness, rating, and popularity, 
	as a JSON array with this structure:
[
  {
    "dish": {
      "name": "specific dish name",
      "description": "dish description",
      "rating": "rating out of 5 from google maps reviews"
    },
    "restaurant": {
      "name": "restaurant name",
      "address": "full address",
      "lat": "latitude of the restaurant",
      "lng": "longitude of the restaurant",
      "website": "Official restaurant website or null if not available"
    }
  }
]

Respond with valid, strict JSON only. 
Do not include comments, trailing commas, or single quotes. 
Only use double quotes for property names and string values.`

  // Runtime check: ensure all required values are present in the prompt string
  if (prompt.indexOf(dishName) === -1 || prompt.indexOf(location.lat) === -1 || prompt.indexOf(location.long) === -1) {
    throw new Error("Prompt is missing required search parameters.")
  }
  return prompt
}

export default defineEventHandler(async (event) => {
  // CORS headers
  setHeader(
    event,
    "Access-Control-Allow-Origin",
    process.env.NODE_ENV === "production" ? "https://dishola.com" : "http://localhost:3000"
  )
  setHeader(event, "Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  setHeader(event, "Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (event.method === "OPTIONS") {
    return new Response(null, { status: 204 })
  }

  // Location fallback logic
  function getLocationFromRequest(event: H3Event) {
    const query = getQuery(event)
    // 1. Use query params if present
    const lat = typeof query.lat === "string" ? query.lat : Array.isArray(query.lat) ? query.lat[0] : undefined
    const long = typeof query.long === "string" ? query.long : Array.isArray(query.long) ? query.long[0] : undefined
    if (lat && long) {
      return {
        lat,
        long,
        address: typeof query.address === "string" ? query.address : ""
      }
    }
    // 2. Try Vercel headers
    const headers = event.node.req.headers
    const headerLat = headers["x-vercel-ip-latitude"]
    const headerLong = headers["x-vercel-ip-longitude"]
    const city = headers["x-vercel-ip-city"]
    const region = headers["x-vercel-ip-country-region"]
    const country = headers["x-vercel-ip-country"]
    if (headerLat && headerLong) {
      return {
        lat: headerLat,
        long: headerLong,
        address: [city, region, country].filter(Boolean).join(", ")
      }
    }
    // 3. Fallback to Vercel HQ
    return {
      lat: "37.7897",
      long: "-122.3942",
      address: "100 First St, San Francisco, CA"
    }
  }

  const query = getQuery(event)
  const locationInfo = getLocationFromRequest(event)

  // ---- CACHE CHECK ----
  const cacheKey = getCacheKey(query.q as string, locationInfo.lat, locationInfo.long, query.includeTastes === "true")
  const cached = SEARCH_CACHE.get(cacheKey)
  const now = Date.now()
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  if (!query.q) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required parameter: q (query) is required"
    })
  }

  const searchPrompt = query.q as string
  const location = locationInfo.address || `${locationInfo.lat},${locationInfo.long}`

  const headers = event.node.req.headers
  const city = headers["x-vercel-ip-city"]
  const postal = headers["x-vercel-ip-postal-code"]

  let displayLocation: string
  if (city && postal) {
    displayLocation = `${city} ${postal}`
  } else {
    displayLocation = `${locationInfo.lat},${locationInfo.long}`
  }

  try {
    // Get auth token if provided
    const authHeader = getHeader(event, "authorization")
    let userTastes: string[] = []
    const includeTastes = query.includeTastes === "true"

    // If auth token is provided and includeTastes is true, fetch user tastes
    if (authHeader?.startsWith("Bearer ") && includeTastes) {
      const token = authHeader.split(" ")[1]
      // Create Supabase client with user's token
      const supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      )

      // Validate the user token and get their tastes
      const {
        data: { user }
      } = await supabaseClient.auth.getUser()
      if (!user) return

      if (user) {
        const { data } = await supabaseClient
          .from("user_tastes")
          .select(`
            taste_dictionary:taste_dictionary_id (
              name,
              type
            )
          `)
          .eq("user_id", user.id)
          .order("order_position")

        // Extract taste names for the prompt
        userTastes = (data || []).map((item: any) => item.taste_dictionary?.name).filter(Boolean)
      }
    }

    // Parse the user query to extract structured data
    const parsedQuery = await parseUserQuery(searchPrompt)
    // Get AI-powered recommendations
    const aiResults = await getDishRecommendationa(parsedQuery, locationInfo, userTastes)
    // Get community (database) recommendations
    const dbResults = await getDbDishRecommendations(parsedQuery.dishName)

    const result = {
      query: searchPrompt,
      location: location,
      lat: locationInfo.lat,
      long: locationInfo.long,
      displayLocation,
      parsedQuery: parsedQuery,
      aiResults,
      dbResults,
      includedTastes: userTastes.length > 0 ? userTastes : null,
      neighborhood: undefined // Add neighborhood if available
    }
    SEARCH_CACHE.set(cacheKey, { data: result, timestamp: now })
    return result
  } catch (error) {
    console.error("Search error:", error)
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to search dishes"
    })
  }
})

async function parseUserQuery(query: string): Promise<ParsedQuery> {
  const prompt = `Parse this food search query into structured data. Extract:
- dishName: specific dish or food item
- cuisine: nationality/type (Italian, Mexican, Asian, American, etc.)

Query: "${query}"

Respond with valid, strict JSON only. Do not include comments, trailing commas, or single quotes. Only use double quotes for property names and string values.`

  let response: string
  try {
    response = await generateAIResponse(prompt)
    return JSON.parse(response)
  } catch (error) {
    console.error("Query parsing error:", { error, response })
    // Fallback parsing
    return {
      dishName: query,
      cuisine: "Any"
    }
  }
}

async function getDishRecommendationa(
  q: ParsedQuery,
  location: Location,
  userTastes: string[] = []
): Promise<DishRecommendation[]> {
  const prompt = getPrompt(q.dishName, location, userTastes)
  try {
    const response = await generateAIResponse(prompt)
    const parsed = JSON.parse(response)
    return parsed.map((rec: { dish: { name: string }; restaurant: { name: string } }, idx: number) => ({
      ...rec,
      id: `${rec.dish.name.replace(/\s+/g, "_")}-${rec.restaurant.name.replace(/\s+/g, "_")}-${idx}`
    }))
  } catch (error) {
    console.error("Restaurant recommendation error:", error)
    return []
  }
}

async function getDbDishRecommendations(dishName: string): Promise<DishRecommendation[]> {
  const { data, error } = await supabase
    .from("dishes")
    .select(
      `id,name,vote_avg,vote_count,
      restaurant:restaurants(id,name,address_line1,city,state,latitude,longitude)`
    )
    .ilike("name", `%${dishName}%`)
    .order("vote_avg", { ascending: false })
    .limit(5)

  if (error) {
    console.error("Database search error:", error)
    return []
  }

  return (data || []).map((rec: any, idx: number) => {
    const restaurantAddrParts = [rec.restaurant?.address_line1, rec.restaurant?.city, rec.restaurant?.state].filter(
      Boolean
    )
    return {
      id: `${rec.name.replace(/\s+/g, "_")}-${rec.restaurant?.name.replace(/\s+/g, "_")}-${idx}`,
      dish: {
        name: rec.name,
        description: "",
        rating: rec.vote_avg ? (Number(rec.vote_avg) / 2).toFixed(1) : "0"
      },
      restaurant: {
        name: rec.restaurant?.name,
        address: restaurantAddrParts.join(", "),
        lat: rec.restaurant?.latitude ? String(rec.restaurant.latitude) : "",
        lng: rec.restaurant?.longitude ? String(rec.restaurant.longitude) : "",
        website: ""
      }
    }
  })
}

async function generateAIResponse(prompt: string): Promise<string> {
  const model = await getModel()

  try {
    const { text } = await generateText({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      // Set a higher max tokens for Claude to ensure complete responses
      maxOutputTokens: 1500
    })
    return text
  } catch (error) {
    console.error("AI model error:", error)
    // Fall back to a simpler response format if the AI call fails
    return JSON.stringify([
      {
        dish: {
          name: "Error generating recommendations",
          description: "We couldn't generate personalized recommendations at this time. Please try again later.",
          rating: "N/A"
        },
        restaurant: {
          name: "Unknown",
          address: "N/A",
          lat: "0",
          lng: "0",
          website: null
        }
      }
    ])
  }
}

// defineRouteMeta({
//   openAPI: {
//     tags: ['Search'],
//     summary: 'Search for dishes at restaurants',
//     description: 'Search for dishes at restaurants using AI-powered query parsing and restaurant recommendations',
//     parameters: [
//       {
//         in: 'query',
//         name: 'q',
//         required: true,
//         description: 'Search query/prompt for dishes',
//         schema: {
//           type: 'string',
//           example: 'spicy pasta'
//         }
//       },
//       {
//         in: 'query',
//         name: 'location',
//         required: true,
//         description: 'Location to search in',
//         schema: {
//           type: 'string',
//           example: 'New York, NY'
//         }
//       }
//     ],
//     responses: {
//       200: {
//         description: 'Successful search results',
//         content: {
//           'application/json': {
//             schema: {
//               type: 'object',
//               properties: {
//                 query: { type: 'string', description: 'The search query used' },
//                 location: { type: 'string', description: 'The location searched' },
//                 results: {
//                   type: 'array',
//                   items: {
//                     type: 'object',
//                     properties: {
//                       dishName: { type: 'string', description: 'Name of the dish' },
//                       dishImageUrl: { type: 'string', description: 'Image URL of the dish' },
//                       cuisine: { type: 'string', description: 'Cuisine type (e.g., Italian, Mexican, Asian)' },
//                       restaurant: {
//                         type: 'object',
//                         properties: {
//                           name: { type: 'string', description: 'Restaurant name' },
//                           address: { type: 'string', description: 'Restaurant address' },
//                           lat: { type: 'string', description: 'Restaurant latitude' },
//                           lng: { type: 'string', description: 'Restaurant longitude' },
//                           website: { type: 'string', description: 'Restaurant website URL' }
//                         }
//                       },
//                       description: { type: 'string', description: 'Dish description' },
//                       rating: { type: 'string', description: 'Dish rating (e.g., 4.5)' }
//                     }
//                   }
//                 }
//               }
//             }
//           }
//         }
//       },
//       400: {
//         description: 'Bad request - missing required parameters',
//         content: {
//           'application/json': {
//             schema: {
//               type: 'object',
//               properties: {
//                 statusCode: { type: 'number' },
//                 statusMessage: { type: 'string' }
//               }
//             }
//           }
//         }
//       },
//       500: {
//         description: 'Internal server error',
//         content: {
//           'application/json': {
//             schema: {
//               type: 'object',
//               properties: {
//                 statusCode: { type: 'number' },
//                 statusMessage: { type: 'string' }
//               }
//             }
//           }
//         }
//       }
//     }
//   }
// });
