// This route proxies an image search for a given query string.
// It tries Google Custom Search API first, then falls back to Unsplash if needed.
import { defineEventHandler, getQuery, setHeader } from "h3";
import { googleImageSearch } from "../../lib/googleImageSearch";
import { imageCache } from "../../lib/imageCache";
import { unsplashImageSearch } from "../../lib/unsplashImageSearch";

export default defineEventHandler(async (event) => {
	const { q } = getQuery(event);
	if (!q || typeof q !== "string") {
		event.res.statusCode = 400;
		return 'Missing query parameter "q"';
	}

	const cacheStats = imageCache.getStats();
	console.debug(`[API] Image cache stats: ${JSON.stringify(cacheStats)}`);

	// Try Google Custom Search first
	const googleApiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
	const googleCx = process.env.GOOGLE_CUSTOM_SEARCH_CX;
	let imageUrl: string | null = null;

	if (googleApiKey && googleCx) {
		console.debug(`[API] Using Google image search for: ${q}`);
		imageUrl = await googleImageSearch(q, googleApiKey, googleCx);
	}

	// Fallback to Unsplash if Google fails or is not configured
	if (!imageUrl) {
		const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
		if (unsplashKey) {
			console.debug(`[API]Falling back to Unsplash for: ${q}`);
			imageUrl = await unsplashImageSearch(q, unsplashKey);
		}
	}

	if (!imageUrl) {
		event.res.statusCode = 404;
		return "No image found";
	}

	// Fetch and stream the image
	try {
		const imageRes = await fetch(imageUrl);
		if (!imageRes.ok || !imageRes.body) {
			event.res.statusCode = 502;
			return "Failed to fetch image";
		}

		setHeader(
			event,
			"Content-Type",
			imageRes.headers.get("content-type") || "image/jpeg",
		);
		setHeader(event, "Cache-Control", "s-maxage=86400, stale-while-revalidate");

		return imageRes.body;
	} catch (error) {
		console.error("Error fetching image:", error);
		event.res.statusCode = 502;
		return "Failed to fetch image";
	}
});
