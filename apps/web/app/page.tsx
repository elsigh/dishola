"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"

export default function HomePage() {
  const { user, isLoading: authLoading, getUserTastes } = useAuth()
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const router = useRouter()

  // Get geolocation for signed-in users
  useEffect(() => {
    if (!authLoading && user && latitude === null && longitude === null && !isGettingLocation) {
      setIsGettingLocation(true)
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude: lat, longitude: lng } = position.coords
            setLatitude(lat)
            setLongitude(lng)
            setIsGettingLocation(false)
          },
          (error) => {
            console.error("Geolocation error:", error)
            setIsGettingLocation(false)
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        )
      } else {
        setIsGettingLocation(false)
      }
    }
  }, [user, authLoading, latitude, longitude, isGettingLocation])

  // Redirect logged-in users to search page with location and inline taste parameters
  useEffect(() => {
    if (!authLoading && user && latitude !== null && longitude !== null) {
      const searchParams = new URLSearchParams()
      searchParams.append("lat", latitude.toString())
      searchParams.append("long", longitude.toString())
      
      // Get user tastes from auth context (already loaded)
      const userTastes = getUserTastes()
      if (userTastes.length > 0) {
        // Inline the actual taste names in the URL
        searchParams.append("tastes", userTastes.join(","))
      }
      
      // Always redirect with location parameters
      router.replace(`/search?${searchParams.toString()}`)
    }
  }, [user, authLoading, latitude, longitude, getUserTastes, router])

  // If user is not signed in, show the standard homepage
  if (authLoading || (user && isGettingLocation)) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 md:py-20">
        <div className="animate-pulse">
          <h1 className="text-5xl md:text-6xl font-bold text-brand-primary mb-4">dishola</h1>
          {authLoading ? (
            <p className="text-lg text-brand-text-muted">Loading...</p>
          ) : (
            <p className="text-lg text-brand-text-muted">Getting your location...</p>
          )}
        </div>
      </div>
    )
  }

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

  // For logged-in users, show loading state while redirecting
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 md:py-20">
      <div className="animate-pulse">
        <h1 className="text-5xl md:text-6xl font-bold text-brand-primary mb-4">dishola</h1>
        <p className="text-lg text-brand-text-muted">Redirecting to search...</p>
      </div>
    </div>
  )
}
