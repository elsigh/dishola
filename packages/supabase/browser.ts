import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

let supabase: SupabaseClient

export function createClient(): SupabaseClient {
  if (supabase) return supabase
  supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true }
  })
  return supabase
}

// Named alias for clarity
export { createClient as createBrowserClient }
