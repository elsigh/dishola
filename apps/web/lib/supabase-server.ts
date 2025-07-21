import { createClient as baseCreateClient } from "@dishola/supabase/server"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()
  return baseCreateClient(cookieStore as any)
}
