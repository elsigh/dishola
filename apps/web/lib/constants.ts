export const API_BASE_URL =
	process.env.NEXT_PUBLIC_API_BASE_URL ||
	(process.env.NODE_ENV === "production"
		? "https://api.dishola.com"
		: "http://localhost:3001");
