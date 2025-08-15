import { createGatewayProvider } from "@ai-sdk/gateway"
import { get } from "@vercel/edge-config"
import type { LanguageModel } from "ai"
import { streamText } from "ai"
import { createError, defineEventHandler, getQuery, type H3Event } from "h3"
import type { DishRecommendation, Location, ParsedQuery } from "../../../../lib/types"
import { setCorsHeaders } from "../../../lib/cors"
import { createLogger } from "../../../lib/logger"

const gateway = createGatewayProvider({
  apiKey: process.env.GATEWAY_API_KEY
})

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: string, lon1: string, lat2: string, lon2: string): number {
  const toRad = (value: number) => (value * Math.PI) / 180

  const lat1Num = parseFloat(lat1)
  const lon1Num = parseFloat(lon1)
  const lat2Num = parseFloat(lat2)
  const lon2Num = parseFloat(lon2)

  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2Num - lat1Num)
  const dLon = toRad(lon2Num - lon1Num)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1Num)) * Math.cos(toRad(lat2Num)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return Math.round(distance * 10) / 10 // Round to 1 decimal place
}

// Deduplicate results based on dish name + restaurant name
function deduplicateResults(results: DishRecommendation[]): DishRecommendation[] {
  const seen = new Set<string>()
  return results.filter((result) => {
    const key = `${result.dish.name.toLowerCase().trim()}-${result.restaurant.name.toLowerCase().trim()}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

async function getModel(logger: ReturnType<typeof createLogger>): Promise<LanguageModel> {
  try {
    // Try to get model from Edge Config
    const configModel = await get("SEARCH_AI_MODEL")
    if (configModel) {
      logger.debug(`Using search model from Edge Config: ${configModel}`)
      // @ts-ignore
      return gateway(configModel)
    }
  } catch (error) {
    logger.warn("Failed to fetch SEARCH_AI_MODEL from Edge Config", { error })
  }

  // Fallback to Claude 3.5 Sonnet - optimized for complex search tasks
  const fallbackModel = "anthropic/claude-3-5-sonnet-20241022"
  logger.debug(`Using fallback search model: ${fallbackModel}`)

  // @ts-ignore
  return gateway(fallbackModel)
}

function getPrompt(dishName: string, location: Location, userTastes: string[] = [], sortBy: string = "distance") {
  let promptBase = `Return the top 15 best ${dishName} recommendations`

  // If user has tastes, include them in the prompt
  if (userTastes.length > 0) {
    promptBase = `Return the top 15 best ${dishName} recommendations that would appeal to someone who likes ${userTastes.join(", ")}`
  }

  // Adjust sorting based on user preference with stronger distance constraints
  let sortInstruction = ""
  if (sortBy === "rating") {
    sortInstruction =
      "PRIORITIZE the highest rated restaurants (4.5+ stars preferred) even if they are further away. Sort by rating first (highest to lowest), then consider distance as a secondary factor"
  } else {
    sortInstruction =
      "PRIORITIZE the closest restaurants to the user's exact coordinates. FOCUS HEAVILY ON PROXIMITY: At least 8-10 results should be within 0.5 miles, and ALL results should be within 3 miles maximum. Sort by distance first (closest to furthest). Only consider rating as a secondary factor after distance"
  }

  const prompt = `${promptBase} near the coordinates (${location.lat}, ${location.long}).

SORTING REQUIREMENTS: ${sortInstruction}

DISTANCE CONSTRAINTS:
- MANDATORY: At least 8 results MUST be within 0.5 miles of the coordinates
- MANDATORY: NO results should be more than 3 miles away
- Focus on walkable distance first, then nearby driving distance
- If you can't find enough results within 0.5 miles, expand gradually to 1 mile, then 2 miles maximum

LOCATION CONSTRAINT: All recommendations must be actual restaurants that exist near the provided coordinates. Calculate actual distances from the coordinates using precise latitude/longitude.

Return results as a JSON array with this structure:
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

async function parseUserQuery(query: string, logger: ReturnType<typeof createLogger>): Promise<ParsedQuery> {
  const prompt = `Parse this food search query into structured data. Extract:
- dishName: specific dish or food item
- cuisine: nationality/type (Italian, Mexican, Asian, American, etc.)

Query: "${query}"

Respond with valid, strict JSON only. Do not include comments, trailing commas, or single quotes. Only use double quotes for property names and string values.`

  let response: string
  try {
    response = await generateAIResponse(prompt, logger)
    return JSON.parse(response)
  } catch (error) {
    logger.error("Query parsing error", { error })
    // Fallback parsing
    return {
      dishName: query,
      cuisine: "Any"
    }
  }
}

async function generateAIResponse(prompt: string, logger: ReturnType<typeof createLogger>): Promise<string> {
  const model = await getModel(logger)
  
  const startTime = Date.now()
  let firstTokenTime: number | null = null
  let tokenCount = 0

  try {
    const result = await streamText({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      maxOutputTokens: 4000
    })

    // Collect the streamed response
    let fullText = ""
    
    for await (const chunk of result.textStream) {
      // Capture timing for first token
      if (firstTokenTime === null) {
        firstTokenTime = Date.now()
        logger.debug("First token received", { 
          timeToFirstToken: firstTokenTime - startTime 
        })
      }
      
      fullText += chunk
      tokenCount++
    }

    const endTime = Date.now()
    const totalTime = endTime - startTime
    const timeToFirstToken = firstTokenTime ? firstTokenTime - startTime : totalTime

    logger.info("AI response completed", {
      totalTime,
      timeToFirstToken,
      estimatedTokens: tokenCount,
      avgTokensPerSecond: Math.round((tokenCount / (totalTime / 1000)) * 100) / 100
    })

    return fullText
  } catch (error) {
    const errorTime = Date.now() - startTime
    logger.error("AI model error", { error, timeTaken: errorTime })
    
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

async function getDishRecommendations(
  q: ParsedQuery,
  location: Location,
  userTastes: string[] = [],
  sortBy: string = "distance",
  logger: ReturnType<typeof createLogger>
): Promise<DishRecommendation[]> {
  const prompt = getPrompt(q.dishName, location, userTastes, sortBy)
  try {
    const response = await generateAIResponse(prompt, logger)

    // Clean and validate JSON response
    let cleanedResponse = response.trim()

    // Remove any markdown code blocks if present
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, "").replace(/\s*```$/, "")
    } else if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, "").replace(/\s*```$/, "")
    }

    // Log the raw response for debugging if it's problematic
    if (!cleanedResponse.startsWith("[") && !cleanedResponse.startsWith("{")) {
      logger.error("AI response doesn't look like JSON", { preview: cleanedResponse.substring(0, 200) + "..." })
      return []
    }

    let parsed: any
    try {
      parsed = JSON.parse(cleanedResponse)
    } catch (parseError) {
      logger.error("JSON parse error", {
        responseLength: cleanedResponse.length,
        preview: cleanedResponse.substring(0, 500) + "...",
        ending: "..." + cleanedResponse.substring(cleanedResponse.length - 200),
        parseError
      })

      // Try to fix incomplete JSON by finding the last complete object
      const lastCompleteArrayMatch = cleanedResponse.match(/^(.*})\s*,?\s*\{[^}]*$/s)
      if (lastCompleteArrayMatch) {
        const truncatedJson = lastCompleteArrayMatch[1] + "]"
        logger.debug("Attempting to parse truncated JSON", { length: `${truncatedJson.length} characters` })
        try {
          parsed = JSON.parse(truncatedJson)
          logger.debug("Successfully parsed truncated JSON", { results: parsed.length })
        } catch (truncatedError) {
          logger.error("Truncated JSON parsing also failed", { truncatedError })
          return []
        }
      } else {
        return []
      }
    }

    // Ensure we have an array
    if (!Array.isArray(parsed)) {
      logger.error("AI response is not an array", { type: typeof parsed })
      return []
    }

    // Validate each result has required structure
    const validResults = parsed.filter((rec: any) => {
      return rec?.dish?.name && rec?.restaurant?.name && rec?.dish?.rating
    })

    if (validResults.length === 0) {
      logger.error("No valid results from AI response")
      return []
    }

    // Map results and calculate distances for server-side verification/sorting
    const resultsWithDistance = validResults.map((rec: any, idx: number) => {
      const hasCoordinates = rec.restaurant?.lat && rec.restaurant?.lng
      const distance = hasCoordinates
        ? calculateDistance(location.lat, location.long, rec.restaurant.lat, rec.restaurant.lng)
        : 999 // Set high distance for restaurants without coordinates

      return {
        ...rec,
        id: `${rec.dish.name.replace(/\s+/g, "_")}-${rec.restaurant.name.replace(/\s+/g, "_")}-${idx}`,
        distance,
        numericRating: parseFloat(rec.dish.rating) || 0
      }
    })

    // Sort results server-side to ensure proper ordering regardless of AI response
    const sortedResults = resultsWithDistance.sort((a, b) => {
      if (sortBy === "rating") {
        // Sort by rating first, then by distance
        const ratingDiff = b.numericRating - a.numericRating
        if (Math.abs(ratingDiff) > 0.1) return ratingDiff
        return a.distance - b.distance
      } else {
        // Sort by distance first, then by rating
        const distanceDiff = a.distance - b.distance
        if (Math.abs(distanceDiff) > 0.1) return distanceDiff
        return b.numericRating - a.numericRating
      }
    })

    // Return results without temporary sorting fields
    return sortedResults.map(({ distance, numericRating, ...result }) => result)
  } catch (error) {
    logger.error("Restaurant recommendation error", { error })
    return []
  }
}

export default defineEventHandler(async (event) => {
  const logger = createLogger({ event, handlerName: "search/ai" })

  // Handle CORS
  const corsResponse = setCorsHeaders(event, { methods: ["GET", "OPTIONS"] })
  if (corsResponse) return corsResponse

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

  const query = getQuery(event)
  const locationInfo = getLocationFromRequest(event)

  // Get sort parameter (default to distance)
  const sortBy = typeof query.sort === "string" ? query.sort : "distance"

  // Validate that we have either a query or tastes parameter (but not both)
  if (!query.q && !query.tastes) {
    logger.error("AI search API error: Missing required parameters", { q: query.q, tastes: query.tastes })
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required parameter: either 'q' (query) or 'tastes' is required"
    })
  }

  // If both are present, prioritize q and ignore tastes
  const useQuery = !!query.q
  const useTastes = !useQuery && !!query.tastes

  try {
    const searchPrompt = query.q as string
    
    logger.info("Fetching AI recommendations", { 
      useQuery, 
      useTastes, 
      query: searchPrompt, 
      tastes: query.tastes,
      sortBy, 
      location: locationInfo 
    })

    // Get user tastes if needed
    let userTastes: string[] = []
    if (useTastes && typeof query.tastes === "string") {
      userTastes = query.tastes
        .split(",")
        .map((taste: string) => taste.trim())
        .filter(Boolean)
    }

    // Parse the user query to extract structured data (only if using query search)
    const parsedQuery = useQuery
      ? await parseUserQuery(searchPrompt, logger)
      : { dishName: userTastes.join(", "), cuisine: "Any" }
    
    // Get AI-powered recommendations
    const aiResults = await getDishRecommendations(
      parsedQuery,
      locationInfo,
      useTastes ? userTastes : [],
      sortBy,
      logger
    )

    // Deduplicate AI results
    const deduplicatedResults = deduplicateResults(aiResults)

    logger.info("AI search completed", { 
      resultsCount: deduplicatedResults.length,
      query: searchPrompt || "tastes-based",
      parsedQuery 
    })

    return {
      results: deduplicatedResults,
      query: searchPrompt,
      location: locationInfo.address || `${locationInfo.lat},${locationInfo.long}`,
      parsedQuery,
      includedTastes: userTastes.length > 0 ? userTastes : null,
      sortBy
    }
  } catch (error) {
    logger.error("AI search error", { error })
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to get AI dish recommendations"
    })
  }
})