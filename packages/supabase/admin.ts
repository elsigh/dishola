import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// @preserve
// Admin / service-level client usable from backend (Nitro, scripts)

// biome-ignore lint/style/noNonNullAssertion: env vars validated at runtime.
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
// biome-ignore lint/style/noNonNullAssertion: env vars validated at runtime.
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase: SupabaseClient = createSupabaseClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
})

// Convenience creator for multi-client scenarios
export function createClient(): SupabaseClient {
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  })
}
