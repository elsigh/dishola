import { imageCache } from "./imageCache";

/**
 * Searches for images using Google Custom Search API
 * Uses in-memory caching to avoid unnecessary API calls
 * @param query The search query
 * @param apiKey Google API key
 * @param cx Custom Search Engine ID
 * @param bypassCache Optional flag to bypass cache
 * @returns URL of the first image found, or null if none found
 */
export async function googleImageSearch(
	query: string,
	apiKey: string,
	cx: string,
	bypassCache = false,
): Promise<string | null> {
	// Create a cache key from the query
	const cacheKey = `google:${query}`;

	// Check cache first (unless bypassing)
	if (!bypassCache) {
		const cachedUrl = imageCache.get(cacheKey);
		if (cachedUrl) {
			console.debug(`[API] Cache hit for Google image search: ${query}`);
			return cachedUrl;
		}
	}

	try {
		console.debug(`[API] Cache miss for Google image search: ${query}`);
		const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}&searchType=image&num=1`;
		const res = await fetch(url);
		if (!res.ok) {
			console.error(`Google API error: ${res.status} ${res.statusText}`);
			return null;
		}

		const data = await res.json();
		if (data.items && data.items.length > 0) {
			const imageUrl = data.items[0].link;
			// Store in cache (even if bypassing cache for this request)
			imageCache.set(cacheKey, imageUrl);
			return imageUrl;
		} else {
			console.debug(`[API] No images found for Google image search: ${query}`);
		}

		return null;
	} catch (error) {
		console.error("Error in Google image search:", error);
		return null;
	}
}
