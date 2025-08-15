import { setHeader, type H3Event } from "h3"

interface CorsOptions {
  methods?: string[]
  headers?: string[]
  origin?: string
}

export function setCorsHeaders(event: H3Event, options: CorsOptions = {}) {
  const {
    methods = ["GET", "POST", "OPTIONS"],
    headers = ["Content-Type", "Authorization"],
    origin = process.env.NODE_ENV === "production" ? "https://dishola.com" : "http://localhost:3000"
  } = options

  // Set CORS headers
  setHeader(event, "Access-Control-Allow-Origin", origin)
  setHeader(event, "Access-Control-Allow-Methods", methods.join(","))
  setHeader(event, "Access-Control-Allow-Headers", headers.join(", "))

  // Handle preflight OPTIONS request
  if (event.method === "OPTIONS") {
    return new Response(null, { status: 204 })
  }

  return null
}