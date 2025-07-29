import { getQuery } from "h3"
import { getUserProfileByUsername } from "@/lib/user-service"

export default defineEventHandler(async (event) => {
  setHeader(
    event,
    "Access-Control-Allow-Origin",
    process.env.NODE_ENV === "production" ? "https://dishola.com" : "http://localhost:3000"
  )
  setHeader(event, "Access-Control-Allow-Methods", "GET,OPTIONS")
  setHeader(event, "Access-Control-Allow-Headers", "Content-Type")

  if (event.method === "OPTIONS") {
    return new Response(null, { status: 204 })
  }

  if (event.method === "GET") {
    const { username } = getQuery(event)
    if (!username || typeof username !== "string") {
      throw createError({ statusCode: 400, statusMessage: "Missing or invalid username" })
    }
    const profile = await getUserProfileByUsername(username)
    if (!profile) {
      throw createError({ statusCode: 404, statusMessage: "User not found" })
    }
    return profile
  }

  throw createError({ statusCode: 405, statusMessage: "Method not allowed" })
})
