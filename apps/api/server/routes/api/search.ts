import { createGatewayProvider } from "@ai-sdk/gateway"
import { supabase } from "@dishola/supabase/admin"
import { get } from "@vercel/edge-config"
import type { LanguageModel } from "ai"
import { generateText } from "ai"
import { setHeader } from "h3"
import type { DishRecommendation, Location, ParsedQuery } from "../../../lib/types"

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

function getPrompt(dishName: string, location: Location) {
  const prompt = `Return the top 5 best ${dishName} recommendations
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
  function getLocationFromRequest(event: any) {
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
    // Parse the user query to extract structured data
    const parsedQuery = await parseUserQuery(searchPrompt)
    // Get AI-powered recommendations
    const aiResults = await getDishRecommendationa(parsedQuery, locationInfo)
    // Get community (database) recommendations
    const dbResults = await getDbDishRecommendations(parsedQuery.dishName, locationInfo)

    return {
      query: searchPrompt,
      location: location,
      lat: locationInfo.lat,
      long: locationInfo.long,
      displayLocation,
      parsedQuery: parsedQuery,
      aiResults,
      dbResults
    }
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

async function getDishRecommendationa(q: ParsedQuery, location: Location): Promise<DishRecommendation[]> {
  const prompt = getPrompt(q.dishName, location)
  try {
    const response = await generateAIResponse(prompt)
    const parsed = JSON.parse(response)
    // Assign a unique id to each recommendation
    return parsed.map((rec: any, idx: number) => ({
      ...rec,
      id: `${rec.dish.name.replace(/\s+/g, "_")}-${rec.restaurant.name.replace(/\s+/g, "_")}-${idx}`
    }))
  } catch (error) {
    console.error("Restaurant recommendation error:", error)
    return []
  }
}

async function getDbDishRecommendations(dishName: string, location: Location): Promise<DishRecommendation[]> {
  // Search for dishes matching the name (case-insensitive, partial match)
  // and join the related restaurant information. Because the legacy data
  // does not include full-text search indexes, we rely on an ILIKE filter.
  // For now we fetch the top results ordered by rating (vote_avg).
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
    const restaurantAddrParts = [rec.restaurant.address_line1, rec.restaurant.city, rec.restaurant.state].filter(
      Boolean
    )
    return {
      id: `${rec.name.replace(/\s+/g, "_")}-${rec.restaurant.name.replace(/\s+/g, "_")}-${idx}`,
      dish: {
        name: rec.name,
        description: "",
        rating: rec.vote_avg ? (Number(rec.vote_avg) / 2).toFixed(1) : "0"
      },
      restaurant: {
        name: rec.restaurant.name,
        address: restaurantAddrParts.join(", "),
        lat: rec.restaurant.latitude ? String(rec.restaurant.latitude) : "",
        lng: rec.restaurant.longitude ? String(rec.restaurant.longitude) : "",
        website: ""
      }
    }
  })
}

async function generateAIResponse(prompt: string): Promise<string> {
  const model = await getModel()
  const { text } = await generateText({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3
  })
  return text
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
