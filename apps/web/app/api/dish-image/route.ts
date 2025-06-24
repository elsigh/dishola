import { API_BASE_URL } from "@/lib/constants";
import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const q = searchParams.get("q");
	if (!q) {
		return new Response("Missing query", { status: 400 });
	}

	const apiUrl = `${API_BASE_URL}/api/dish-image?q=${encodeURIComponent(q)}`;
	const apiRes = await fetch(apiUrl);

	// Pass through headers and status
	const headers = new Headers();
	apiRes.headers.forEach((value, key) => {
		if (key.toLowerCase() === "content-encoding") return;
		headers.set(key, value);
	});

	// Stream the image
	if (apiRes.body) {
		return new Response(apiRes.body, {
			status: apiRes.status,
			headers,
		});
	} else {
		return new Response("No image body", { status: 500 });
	}
}
