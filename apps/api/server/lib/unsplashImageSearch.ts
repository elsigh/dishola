import { imageCache } from "./imageCache"
import type { createLogger } from "./logger"

/**
 * Searches for images using Unsplash API
 * Uses in-memory caching to avoid unnecessary API calls
 * @param query The search query
 * @param accessKey Unsplash API access key
 * @param bypassCache Optional flag to bypass cache
 * @param logger Logger instance for structured logging
 * @returns URL of the first image found, or null if none found
 */
export async function unsplashImageSearch(
  query: string,
  accessKey: string,
  bypassCache = false,
  logger?: ReturnType<typeof createLogger>
): Promise<string | null> {
  // Create a cache key from the query
  const cacheKey = `unsplash:${query}`

  // Check cache first (unless bypassing)
  if (!bypassCache) {
    const cachedUrl = imageCache.get(cacheKey)
    if (cachedUrl) {
      logger?.debug(`Cache hit for Unsplash image search: ${query}`)
      return cachedUrl
    }
  }

  try {
    logger?.debug(`Cache miss for Unsplash image search: ${query}`)
    const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=${accessKey}&per_page=1`
    const searchRes = await fetch(searchUrl)

    if (!searchRes.ok) {
      logger?.error(`Unsplash API error: ${searchRes.status} ${searchRes.statusText}`)
      return null
    }

    const searchData = await searchRes.json()
    if (searchData.results && searchData.results.length > 0) {
      const imageUrl = searchData.results[0].urls.regular
      // Store in cache (even if bypassing cache for this request)
      imageCache.set(cacheKey, imageUrl)
      return imageUrl
    }

    return null
  } catch (error) {
    logger?.error("Error in Unsplash image search:", { error })
    return null
  }
}
