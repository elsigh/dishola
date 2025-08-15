import { createGatewayProvider } from "@ai-sdk/gateway"
import { supabase } from "@dishola/supabase/admin"
import { get } from "@vercel/edge-config"
import type { LanguageModel } from "ai"
import { streamText } from "ai"
import { createError, createEventStream, defineEventHandler, getQuery, type H3Event } from "h3"
import type { DishRecommendation, Location, ParsedQuery } from "../../../lib/types"
import { setCorsHeaders } from "../../lib/cors"
import { getNeighborhoodInfo } from "../../lib/location-utils"
import { createLogger } from "../../lib/logger"
import { searchCache } from "../../lib/searchCache"

/*
ok I need some help with my prompt. I just ran a search for burrito which ran from this  │
│   URL: http://localhost:3000/search?lat=37.78386989327213&long=-122.49223435289763&q=bur   │
│   rito&sort=distance - the first result is completely across town and I know there are     │
│   some great burritos much closer. I don't know why those didn't show up - can you         │
│   inspect my */

const gateway = createGatewayProvider({
  apiKey: process.env.GATEWAY_API_KEY
})

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

async function handleStreamingSearch(
  event: H3Event,
  logger: ReturnType<typeof createLogger>,
  useQuery: boolean,
  useTastes: boolean,
  searchPrompt: string,
  locationInfo: Location,
  sortBy: string,
  query: any
) {
  logger.info("Starting streaming search")
  
  // Create H3 event stream (handles headers and connection management automatically)
  const eventStream = createEventStream(event)
  
  try {
    // Get user tastes if needed
    let userTastes: string[] = []
    if (useTastes && typeof query.tastes === "string") {
      userTastes = query.tastes
        .split(",")
        .map((taste: string) => taste.trim())
        .filter(Boolean)
    }

    // Parse the user query
    const parsedQuery = useQuery
      ? await parseUserQuery(searchPrompt, logger)
      : { dishName: userTastes.join(", "), cuisine: "Any" }

    // Send initial response with metadata
    await eventStream.push({
      event: "metadata",
      data: JSON.stringify({
        query: searchPrompt,
        location: locationInfo.address || `${locationInfo.lat},${locationInfo.long}`,
        lat: locationInfo.lat,
        long: locationInfo.long,
        parsedQuery,
        sortBy
      })
    })

    // Get DB results first (fast)
    logger.debug("Fetching database results")
    const dbResults = await getDbDishRecommendations(parsedQuery.dishName, locationInfo, sortBy, logger)
    const deduplicatedDbResults = deduplicateResults(dbResults)
    
    await eventStream.push({
      event: "dbResults",
      data: JSON.stringify(deduplicatedDbResults)
    })

    // Get AI results with streaming
    logger.debug("Fetching AI recommendations")
    await getDishRecommendationaStreaming(
      parsedQuery,
      locationInfo,
      useTastes ? userTastes : [],
      sortBy,
      logger,
      { push: async (data: any) => {
        await eventStream.push({
          event: data.type,
          data: JSON.stringify(data.data)
        })
      }}
    )
    
    // Get location data
    const locationData = await getNeighborhoodInfo(locationInfo.lat, locationInfo.long, event.headers)
    const { neighborhood, city } = locationData

    // Send final metadata
    await eventStream.push({
      event: "complete",
      data: JSON.stringify({
        neighborhood,
        city,
        includedTastes: userTastes.length > 0 ? userTastes : null
      })
    })

    // Handle client disconnect cleanup
    eventStream.onClosed(async () => {
      logger.debug("Search stream closed by client")
      await eventStream.close()
    })

    return eventStream.send()
  } catch (error) {
    logger.error("Streaming search error", { error })
    await eventStream.push({
      event: "error",
      data: JSON.stringify({ message: "Search failed", error: error instanceof Error ? error.message : 'Unknown error' })
    })
    
    eventStream.onClosed(async () => {
      await eventStream.close()
    })
    
    return eventStream.send()
  }
}

export default defineEventHandler(async (event) => {
  const logger = createLogger({ event, handlerName: "search" })

  // Handle CORS
  const corsResponse = setCorsHeaders(event, { methods: ["GET", "POST", "OPTIONS"] })
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
  
  // Check if client wants to disable streaming (streaming is default)
  const isStreaming = query.stream !== "false" && query.stream !== "0"

  // ---- CACHE SETUP ----
  const cacheKey = searchCache.createKey(
    query.q as string,
    locationInfo.lat,
    locationInfo.long,
    Array.isArray(query.tastes) ? query.tastes.join(",") : (query.tastes as string) || "",
    sortBy
  )
  
  // Check cache for non-streaming requests
  if (!isStreaming) {
    const cached = searchCache.get(cacheKey)
    if (cached) {
      return cached
    }
  }

  // Validate that we have either a query or tastes parameter (but not both)
  if (!query.q && !query.tastes) {
    logger.error("Search API error: Missing required parameters", { q: query.q, tastes: query.tastes })
    throw createError({
      statusCode: 400,
      statusMessage: "Missing required parameter: either 'q' (query) or 'tastes' is required"
    })
  }

  // If both are present, prioritize q and ignore tastes
  const useQuery = !!query.q
  const useTastes = !useQuery && !!query.tastes

  const searchPrompt = query.q as string
  const location = locationInfo.address || `${locationInfo.lat},${locationInfo.long}`

  // ---- STREAMING MODE ----
  if (isStreaming) {
    return handleStreamingSearch(
      event,
      logger,
      useQuery,
      useTastes,
      searchPrompt,
      locationInfo,
      sortBy,
      query
    )
  }

  const headers = event.node.req.headers
  const city = headers["x-vercel-ip-city"]
  const postal = headers["x-vercel-ip-postal-code"]

  let displayLocation: string
  if (city && postal) {
    displayLocation = `${decodeURIComponent(Array.isArray(city) ? city[0] : city)} ${Array.isArray(postal) ? postal[0] : postal}`
  } else {
    displayLocation = `${locationInfo.lat},${locationInfo.long}`
  }

  try {
    // Get auth token if provided
    let userTastes: string[] = []

    // Only process tastes if we're using tastes (not query)
    if (useTastes && typeof query.tastes === "string") {
      // Parse comma-separated taste names directly from URL
      userTastes = query.tastes
        .split(",")
        .map((taste: string) => taste.trim())
        .filter(Boolean)
    }

    // Parse the user query to extract structured data (only if using query search)
    const parsedQuery = useQuery
      ? await parseUserQuery(searchPrompt, logger)
      : { dishName: userTastes.join(", "), cuisine: "Any" }
    // Get AI-powered recommendations with sort preference
    // Only pass userTastes when we're doing taste-based search, not query-based search
    const aiResults = await getDishRecommendationa(
      parsedQuery,
      locationInfo,
      useTastes ? userTastes : [],
      sortBy,
      logger
    )
    // Get community (database) recommendations
    const dbResults = await getDbDishRecommendations(parsedQuery.dishName, locationInfo, sortBy, logger)

    const locationData = await getNeighborhoodInfo(locationInfo.lat, locationInfo.long, event.headers)
    const { neighborhood, city } = locationData

    // Deduplicate AI results
    const deduplicatedAiResults = deduplicateResults(aiResults)

    // Deduplicate DB results
    const deduplicatedDbResults = deduplicateResults(dbResults)

    const result = {
      query: searchPrompt,
      location: location,
      lat: locationInfo.lat,
      long: locationInfo.long,
      displayLocation,
      parsedQuery: parsedQuery,
      aiResults: deduplicatedAiResults,
      dbResults: deduplicatedDbResults,
      includedTastes: userTastes.length > 0 ? userTastes : null,
      neighborhood, // Add neighborhood to the response
      city, // Add city to the response
      sortBy // Add sort parameter to the response
    }
    searchCache.set(cacheKey, result)
    return result
  } catch (error) {
    logger.error("Search error", { error })
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to search dishes"
    })
  }
})

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

async function getDishRecommendationaStreaming(
  q: ParsedQuery,
  location: Location,
  userTastes: string[] = [],
  sortBy: string = "distance",
  logger: ReturnType<typeof createLogger>,
  stream: { push: (data: any) => Promise<void> }
): Promise<DishRecommendation[]> {
  const prompt = getPrompt(q.dishName, location, userTastes, sortBy)
  
  try {
    await stream.push({
      type: "aiProgress",
      data: { status: "starting", message: "Generating AI recommendations..." }
    })

    const model = await getModel(logger)
    const startTime = Date.now()
    let firstTokenTime: number | null = null
    let tokenCount = 0

    const result = await streamText({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      maxOutputTokens: 4000
    })

    // Collect the streamed response
    let fullText = ""
    let lastUpdateTime = startTime
    
    for await (const chunk of result.textStream) {
      // Capture timing for first token
      if (firstTokenTime === null) {
        firstTokenTime = Date.now()
        logger.debug("First token received", { 
          timeToFirstToken: firstTokenTime - startTime 
        })
        
        await stream.push({
          type: "aiProgress", 
          data: { status: "streaming", message: "Receiving response...", timeToFirstToken: firstTokenTime - startTime }
        })
      }
      
      fullText += chunk
      tokenCount++

      // Send periodic progress updates (every 500ms)
      const now = Date.now()
      if (now - lastUpdateTime > 500) {
        await stream.push({
          type: "aiProgress",
          data: { 
            status: "streaming", 
            message: `Processing response... (${Math.round(fullText.length / 10)} chars)`,
            partialLength: fullText.length
          }
        })
        lastUpdateTime = now
      }
    }

    const endTime = Date.now()
    const totalTime = endTime - startTime
    const timeToFirstToken = firstTokenTime ? firstTokenTime - startTime : totalTime

    logger.info("AI streaming response completed", {
      totalTime,
      timeToFirstToken,
      estimatedTokens: tokenCount,
      avgTokensPerSecond: Math.round((tokenCount / (totalTime / 1000)) * 100) / 100
    })

    // Process the complete response
    const results = await processAIResponse(fullText, location, sortBy, logger)
    
    await stream.push({
      type: "aiResults",
      data: {
        results,
        timing: {
          totalTime,
          timeToFirstToken,
          estimatedTokens: tokenCount,
          avgTokensPerSecond: Math.round((tokenCount / (totalTime / 1000)) * 100) / 100
        }
      }
    })

    return results
  } catch (error) {
    logger.error("Streaming AI recommendation error", { error })
    await stream.push({
      type: "aiError",
      data: { message: "AI recommendation failed", error: error instanceof Error ? error.message : 'Unknown error' }
    })
    return []
  }
}

async function getDishRecommendationa(
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

// Extract the AI response processing logic into a separate function
async function processAIResponse(
  response: string,
  location: Location,
  sortBy: string,
  logger: ReturnType<typeof createLogger>
): Promise<DishRecommendation[]> {
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
}

async function getDbDishRecommendations(
  dishName: string,
  userLocation: Location,
  sortBy: string = "distance",
  logger: ReturnType<typeof createLogger>
): Promise<DishRecommendation[]> {
  const { data, error } = await supabase
    .from("dishes")
    .select(
      `id,name,vote_avg,vote_count,
      restaurant:restaurants(id,name,address_line1,city,state,latitude,longitude)`
    )
    .ilike("name", `%${dishName}%`)
    .limit(50) // Get more results to sort and filter down to 15

  if (error) {
    logger.error("Database search error", { error })
    return []
  }

  // Map results and calculate distances
  const resultsWithDistance = (data || []).map((rec: any, idx: number) => {
    const restaurantAddrParts = [rec.restaurant?.address_line1, rec.restaurant?.city, rec.restaurant?.state].filter(
      Boolean
    )

    const hasCoordinates = rec.restaurant?.latitude && rec.restaurant?.longitude
    const distance = hasCoordinates
      ? calculateDistance(
          userLocation.lat,
          userLocation.long,
          String(rec.restaurant.latitude),
          String(rec.restaurant.longitude)
        )
      : 999 // Set high distance for restaurants without coordinates

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
      },
      distance,
      vote_avg: rec.vote_avg || 0
    }
  })

  // Filter out results > 75 miles away
  const filteredResults = resultsWithDistance.filter((result) => result.distance <= 75)

  // Sort based on user preference
  const sortedResults = filteredResults.sort((a, b) => {
    if (sortBy === "rating") {
      // Sort by rating first, then by distance
      const ratingDiff = b.vote_avg - a.vote_avg
      if (Math.abs(ratingDiff) > 0.1) return ratingDiff
      return a.distance - b.distance
    } else {
      // Sort by distance first, then by rating
      const distanceDiff = a.distance - b.distance
      if (Math.abs(distanceDiff) > 0.1) return distanceDiff
      return b.vote_avg - a.vote_avg
    }
  })

  // Return top 15 results, removing temporary fields
  return sortedResults.slice(0, 15).map(({ distance, vote_avg, ...result }) => result)
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
