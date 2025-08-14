import { createGatewayProvider } from "@ai-sdk/gateway"
import { createClient } from "@supabase/supabase-js"
import { get } from "@vercel/edge-config"
import type { LanguageModel } from "ai"
import { generateText } from "ai"
import { createError, defineEventHandler, getHeader, getQuery, type H3Event, setHeader } from "h3"
import type { DishRecommendation, Location } from "../../../lib/types"
import { getNeighborhoodInfo } from "../../lib/location-utils"
import { createLogger } from "../../lib/logger"

// Add cache for taste recommendations
const TASTE_CACHE = new Map<string, { data: Record<string, unknown>; timestamp: number }>()
const TASTE_CACHE_TTL = 3 * 60 * 1000 // 3 minutes

// Add cache for AI responses to save tokens
const AI_RESPONSE_CACHE = new Map<string, { response: string; timestamp: number }>()
const AI_RESPONSE_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

function getTasteCacheKey(userTastes: string[], lat: string, long: string) {
  return JSON.stringify({ userTastes: userTastes.sort(), lat, long })
}

function getAIResponseCacheKey(prompt: string) {
  // Use a hash of the prompt as the cache key
  return Buffer.from(prompt).toString("base64").substring(0, 50)
}

const gateway = createGatewayProvider({
  apiKey: process.env.GATEWAY_API_KEY
})

async function getModel(logger: ReturnType<typeof createLogger>): Promise<LanguageModel> {
  try {
    // Try to get taste recommendations model from Edge Config
    const configModel = await get("TASTE_RECOMMENDATIONS_AI_MODEL")
    if (configModel) {
      logger.debug(`Using taste recommendations model from Edge Config: ${configModel}`)
      // @ts-ignore
      return gateway(configModel)
    }
  } catch (error) {
    logger.warn("Failed to fetch TASTE_RECOMMENDATIONS_AI_MODEL from Edge Config", { error })
  }

  // Fallback to Claude 3 Haiku - optimized for fast, reliable JSON responses
  const fallbackModel = "anthropic/claude-3-haiku-20240307"
  logger.debug(`Using fallback taste recommendations model: ${fallbackModel}`)

  // @ts-ignore
  return gateway(fallbackModel)
}

function getPrompt(userTastes: string[], location: Location) {
  const prompt = `You are a helpful AI assistant that provides restaurant dish recommendations based on user tastes.

Task: Return the top 5 dish recommendations that would appeal to someone who likes ${userTastes.join(", ")}
Location: As close as possible to coordinates (${location.lat}, ${location.long})
Sort criteria: Sort by closeness to the location, rating, and popularity

Format your response as a valid JSON array with this exact structure:
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

IMPORTANT FORMATTING INSTRUCTIONS:
1. Respond with valid, strict JSON only
2. Do not include comments, trailing commas, or single quotes
3. Only use double quotes for property names and string values
4. Do not include any text before or after the JSON array
5. Make sure the JSON is properly formatted and can be parsed by JSON.parse()`

  // Runtime check: ensure all required values are present in the prompt string
  if (
    prompt.indexOf(userTastes.join(", ")) === -1 ||
    prompt.indexOf(location.lat) === -1 ||
    prompt.indexOf(location.long) === -1
  ) {
    throw new Error("Prompt is missing required search parameters.")
  }
  return prompt
}

export default defineEventHandler(async (event) => {
  const logger = createLogger(event, "taste-recommendations")

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

  // Start timing for the entire request (only for non-preflight requests)
  const startTime = Date.now()

  logger.debug(`Taste recommendations API started at ${new Date().toISOString()}`)

  // Get auth token
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
        address: [city, region, country]
          .map((h) => (h ? decodeURIComponent(Array.isArray(h) ? h[0] : h) : h))
          .filter(Boolean)
          .join(", ")
      }
    }
    // 3. Fallback to Vercel HQ
    return {
      lat: "37.7897",
      long: "-122.3942",
      address: "100 First St, San Francisco, CA"
    }
  }

  const locationInfo = getLocationFromRequest(event)
  const location = locationInfo.address || `${locationInfo.lat},${locationInfo.long}`

  // Get enhanced location info with neighborhood
  const headers = event.node.req.headers
  const enhancedLocationInfo = await getNeighborhoodInfo(locationInfo.lat, locationInfo.long, headers)

  // Use neighborhood info for display if available
  let displayLocation: string
  if (enhancedLocationInfo.displayName) {
    displayLocation = enhancedLocationInfo.displayName
  } else {
    const city = headers["x-vercel-ip-city"]
    const postal = headers["x-vercel-ip-postal-code"]
    if (city && postal) {
      displayLocation = `${decodeURIComponent(Array.isArray(city) ? city[0] : city)} ${Array.isArray(postal) ? postal[0] : postal}`
    } else {
      displayLocation = `${locationInfo.lat},${locationInfo.long}`
    }
  }

  try {
    // Get user tastes
    const { data } = await supabase
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
    const userTastes = (data || [])
      .map((item) => {
        // Properly type the taste_dictionary object
        const dictionary = item.taste_dictionary as { name?: string } | null
        return dictionary?.name
      })
      .filter((name): name is string => Boolean(name))

    if (userTastes.length === 0) {
      const totalTime = Date.now() - startTime
      logger.debug(`No tastes found - returning early in ${totalTime}ms`)
      return {
        error: "No taste preferences found. Please add some in your profile.",
        aiResults: [],
        dbResults: []
      }
    }

    // ---- CACHE CHECK ----
    const cacheCheckStart = Date.now()
    const cacheKey = getTasteCacheKey(userTastes, locationInfo.lat, locationInfo.long)
    const cached = TASTE_CACHE.get(cacheKey)
    const now = Date.now()
    if (cached && now - cached.timestamp < TASTE_CACHE_TTL) {
      const cacheTime = Date.now() - cacheCheckStart
      const totalTime = Date.now() - startTime
      logger.debug(`Cache hit - cache lookup: ${cacheTime}ms, total: ${totalTime}ms`, { cacheKey })
      return JSON.parse(JSON.stringify(cached.data)) as Record<string, unknown>
    }

    // AI processing timing
    const aiStartTime = Date.now()
    logger.debug(`Cache miss - starting processing at ${aiStartTime}`, { cacheKey })

    // Get AI-powered recommendations based on user tastes
    const aiResults = await getTasteRecommendations(userTastes, locationInfo, logger)

    const aiTime = Date.now() - aiStartTime
    logger.debug(`AI processing completed in ${aiTime}ms`)

    const result = {
      location: location,
      lat: locationInfo.lat,
      long: locationInfo.long,
      displayLocation,
      neighborhood: enhancedLocationInfo.neighborhood,
      city: enhancedLocationInfo.city,
      userTastes,
      aiResults
    }

    // Cache the result
    TASTE_CACHE.set(cacheKey, { data: result, timestamp: now })
    logger.debug("Cache set", { cacheKey })

    const totalTime = Date.now() - startTime
    logger.debug(`Taste recommendations completed - AI: ${aiTime}ms, total: ${totalTime}ms`)

    return result
  } catch (error) {
    const totalTime = Date.now() - startTime
    logger.error(`Taste recommendations error after ${totalTime}ms`, { error })
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to get taste-based recommendations"
    })
  }
})

async function getTasteRecommendations(
  userTastes: string[],
  location: Location,
  logger: ReturnType<typeof createLogger>
): Promise<DishRecommendation[]> {
  if (userTastes.length === 0) {
    return []
  }

  const prompt = getPrompt(userTastes, location)
  const aiStart = Date.now()

  try {
    const response = await generateAIResponse(prompt, logger)
    const parsed = JSON.parse(response)

    const recommendations = parsed.map((rec: Record<string, unknown>, idx: number) => {
      const dish = rec.dish as { name: string }
      const restaurant = rec.restaurant as { name: string }

      return {
        ...rec,
        id: `${dish.name.replace(/\s+/g, "_")}-${restaurant.name.replace(/\s+/g, "_")}-${idx}`
      }
    })

    logger.debug(`Generated ${recommendations.length} taste recommendations`)
    return recommendations
  } catch (error) {
    const errorTime = Date.now() - aiStart
    logger.error(`Taste recommendation error after ${errorTime}ms`, { error })
    return []
  }
}

async function generateAIResponse(prompt: string, logger: ReturnType<typeof createLogger>): Promise<string> {
  const cacheKey = getAIResponseCacheKey(prompt)
  const now = Date.now()

  // Check AI response cache first
  const cached = AI_RESPONSE_CACHE.get(cacheKey)
  if (cached && now - cached.timestamp < AI_RESPONSE_CACHE_TTL) {
    logger.debug(`AI response cache hit - saved API call`)
    return cached.response
  }

  logger.debug(`AI response cache miss - making API call`)
  const model = await getModel(logger)

  try {
    const { text } = await generateText({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      // Set a higher max tokens for Claude to ensure complete responses
      maxOutputTokens: 1500
    })

    // Cache the successful response
    AI_RESPONSE_CACHE.set(cacheKey, { response: text, timestamp: now })
    logger.debug(`AI response cached for future requests`)

    return text
  } catch (error) {
    logger.error("AI model error", { error })
    // Fall back to a simpler response format if the AI call fails
    const fallbackResponse = JSON.stringify([
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

    // Don't cache error responses
    return fallbackResponse
  }
}
