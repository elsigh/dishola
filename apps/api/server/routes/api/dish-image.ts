// This route proxies an Unsplash image search for a given query string.
// Attribution: See https://unsplash.com/documentation#guideline-attribution for requirements.
import { defineEventHandler, getQuery, setHeader } from "h3";

export default defineEventHandler(async (event) => {
	const { q } = getQuery(event);
	if (!q || typeof q !== "string") {
		event.res.statusCode = 400;
		return 'Missing query parameter "q"';
	}

	const accessKey = process.env.UNSPLASH_ACCESS_KEY;
	if (!accessKey) {
		event.res.statusCode = 500;
		return "Unsplash API key not configured";
	}

	// Search Unsplash for the query
	const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&client_id=${accessKey}&per_page=1`;
	const searchRes = await fetch(searchUrl);
	if (!searchRes.ok) {
		event.res.statusCode = 502;
		return "Failed to search Unsplash";
	}
	const searchData = await searchRes.json();
	if (!searchData.results || searchData.results.length === 0) {
		event.res.statusCode = 404;
		return "No image found";
	}
	const imageUrl = searchData.results[0].urls.regular;

	// Fetch the image
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

	// Stream the image
	return imageRes.body;
});
