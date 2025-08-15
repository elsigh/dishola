import { supabase } from "@dishola/supabase/admin"
import { createError, defineEventHandler, getHeader, getQuery } from "h3"
import { createLogger } from "../../lib/logger"
import { setCorsHeaders } from "../../lib/cors"

// Basic bad words list - in production you'd want a more comprehensive list
const BAD_WORDS = [
  "admin",
  "administrator",
  "root",
  "api",
  "www",
  "mail",
  "email",
  "support",
  "help",
  "info",
  "contact",
  "about",
  "terms",
  "privacy",
  "legal",
  "blog",
  "news",
  "test",
  "demo",
  "sample",
  "example",
  "null",
  "undefined",
  "true",
  "false",
  "system"
  // Add more as needed
]

const RESERVED_USERNAMES = ["dishola", "app", "web", "mobile", "ios", "android", "team", "staff", "official"]

function validateUsername(username: string): { valid: boolean; message?: string } {
  // Length check
  if (username.length < 3) {
    return { valid: false, message: "Username must be at least 3 characters" }
  }

  if (username.length > 50) {
    return { valid: false, message: "Username must be 50 characters or less" }
  }

  // Format check
  if (!/^[a-z0-9_]+$/.test(username)) {
    return { valid: false, message: "Username can only contain lowercase letters, numbers, and underscores" }
  }

  // Can't start or end with underscore
  if (username.startsWith("_") || username.endsWith("_")) {
    return { valid: false, message: "Username cannot start or end with an underscore" }
  }

  // Can't have consecutive underscores
  if (username.includes("__")) {
    return { valid: false, message: "Username cannot contain consecutive underscores" }
  }

  // Check for bad words
  const lowerUsername = username.toLowerCase()
  for (const badWord of BAD_WORDS) {
    if (lowerUsername.includes(badWord)) {
      return { valid: false, message: "This username contains restricted words" }
    }
  }

  // Check for reserved usernames
  if (RESERVED_USERNAMES.includes(lowerUsername)) {
    return { valid: false, message: "This username is reserved" }
  }

  return { valid: true }
}

export default defineEventHandler(async (event) => {
  const logger = createLogger({ event, handlerName: "username-check" })
  // Handle CORS
  const corsResponse = setCorsHeaders(event, { methods: ["GET", "OPTIONS"] })
  if (corsResponse) return corsResponse as any

  if (event.method !== "GET") {
    throw createError({ statusCode: 405, statusMessage: "Method not allowed" })
  }

  // Get user from Authorization header
  const authHeader = getHeader(event, "authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createError({ statusCode: 401, statusMessage: "Missing or invalid authorization header" })
  }

  const token = authHeader.split(" ")[1]
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser(token)

  if (authError || !user) {
    throw createError({ statusCode: 401, statusMessage: "Invalid authentication token" })
  }

  const query = getQuery(event)
  const username = query.username as string

  if (!username) {
    throw createError({ statusCode: 400, statusMessage: "Username parameter is required" })
  }

  // Validate username format and content
  const validation = validateUsername(username)
  if (!validation.valid) {
    return {
      available: false,
      message: validation.message
    }
  }

  try {
    // Check if username already exists (excluding current user)
    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("username", username)
      .neq("user_id", user.id)
      .single()

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      logger.error("Error checking username availability", { error: checkError, username })
      throw createError({ statusCode: 500, statusMessage: "Failed to check username availability" })
    }

    const isAvailable = !existingProfile

    return {
      available: isAvailable,
      message: isAvailable ? "Username is available!" : "Username is already taken"
    }
  } catch (error: unknown) {
    logger.error("Username check error", { error: error instanceof Error ? error.message : String(error), username })
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error
    }
    throw createError({ statusCode: 500, statusMessage: "Internal server error" })
  }
})
