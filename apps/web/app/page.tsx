"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useLocationData } from "@/hooks/useLocationData"
import { useAuth } from "@/lib/auth-context"

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth()
  const { latitude, longitude } = useLocationData()
  const router = useRouter()

  // Redirect logged-in users to search page with location and taste parameters
  useEffect(() => {
    if (!authLoading && user && latitude !== null && longitude !== null) {
      const searchParams = new URLSearchParams()
      searchParams.append("lat", latitude.toString())
      searchParams.append("long", longitude.toString())
      searchParams.append("tastes", "true")
      
      // Use replace to avoid adding to browser history
      router.replace(`/search?${searchParams.toString()}`)
    }
  }, [user, authLoading, latitude, longitude, router])

  // If user is not signed in, show the standard homepage
  if (authLoading) return null

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 md:py-20">
        <h1 className="text-5xl md:text-6xl font-bold text-brand-primary mb-4">dishola</h1>
        <p className="text-lg md:text-xl text-brand-text-muted mb-10 md:mb-16 max-w-2xl">
          Share the love of food, dish by dish. <br />
          The ultimate source to find real meals at real places that rule.
        </p>

        <p className="mt-12 text-md text-brand-text-muted max-w-xl">So, what's your favorite dish?</p>
      </div>
    )
  }

  // For logged-in users, we redirect to search page so this should not render
  // But in case of race conditions, show a minimal loading state
  return null
}
