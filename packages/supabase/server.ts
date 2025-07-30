import { createServerClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

// Generic server-side client creator.
// Pass a cookieStore-like object (e.g. from `next/headers`) to enable
// session persistence; otherwise cookies are ignored (safe for Nitro).

type CookieStoreLike = {
  getAll: () => any
  set?: (name: string, value: string, options?: any) => any
}

// Accepts optional cookieStore; if omitted, sessions won't persist.
export function createClient(cookieStore?: CookieStoreLike): SupabaseClient {
  // biome-ignore lint/style/noNonNullAssertion: env vars validated at runtime
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  // biome-ignore lint/style/noNonNullAssertion: env vars validated at runtime
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const opts = cookieStore
    ? {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: any[]) {
            if (typeof cookieStore.set === "function") {
              // Safely set cookies - ignore errors in Next.js 15 server components
              cookiesToSet.forEach(({ name, value, options }) => {
                try {
                  cookieStore.set!(name, value, options)
                } catch (error) {
                  // Silently ignore cookie setting errors in server components
                  // This is expected in Next.js 15 when cookies can't be modified
                  console.debug("Cookie setting ignored in server component:", name)
                }
              })
            }
          }
        }
      }
    : undefined

  // @ts-ignore – createServerClient's options are compatible
  return createServerClient(url, anon, opts)
}

export { createClient as createServerClient }
