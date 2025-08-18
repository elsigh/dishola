"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import SearchResultsContent from "@/components/search-results-content"
import SearchSection from "@/components/search-section"
import { useAuth } from "@/lib/auth-context"
import { getLocationInfo } from "@/lib/location-utils"

export default function HomePage() {
  const { user, isLoading: authLoading, getUserTastes, profile } = useAuth()
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if we have search parameters
  const q = searchParams.get("q")
  const lat = searchParams.get("lat")
  const long = searchParams.get("long")
  const tastes = searchParams.get("tastes")
  const hasSearchParams = !!(q || tastes) && !!(lat && long)

  // Get location info for search results
  let locationDisplayName = ""
  let neighborhood: string | undefined
  let city: string | undefined

  if (lat && long) {
    const locationInfo = getLocationInfo(parseFloat(lat), parseFloat(long))
    neighborhood = locationInfo.neighborhood
    city = locationInfo.city

    if (locationInfo.neighborhood && locationInfo.city) {
      locationDisplayName = `in ${locationInfo.neighborhood}, ${locationInfo.city}`
    } else if (locationInfo.city) {
      locationDisplayName = `in ${locationInfo.city}`
    } else if (locationInfo.displayName) {
      locationDisplayName = `in ${locationInfo.displayName}`
    }
  }

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

  // Auto-search for logged-in users with tastes when they have location
  useEffect(() => {
    // If logged-in user has location, tastes, and no current search params, auto-search
    if (!authLoading && user && latitude !== null && longitude !== null && profile !== null && !hasSearchParams) {
      const userTastes = getUserTastes()
      console.log("[HomePage] Profile loaded, tastes found:", userTastes.length, userTastes)

      if (userTastes.length > 0) {
        const searchParams = new URLSearchParams()
        searchParams.append("lat", latitude.toString())
        searchParams.append("long", longitude.toString())
        searchParams.append("sort", "distance") // Default sort by distance
        searchParams.append("tastes", userTastes.join(","))

        console.log("[HomePage] Auto-searching with tastes:", searchParams.toString())
        // Stay on homepage, just update URL params
        router.replace(`/?${searchParams.toString()}`)
      }
    }
  }, [user, authLoading, latitude, longitude, getUserTastes, profile, router, hasSearchParams])



  // Show search results if we have search parameters
  if (hasSearchParams) {
    return (
      <div className="w-full">
        <SearchResultsContent locationDisplayName={locationDisplayName} neighborhood={neighborhood} city={city} />
      </div>
    )
  }

  // Show centered search interface (for both logged-in and non-logged-in users)
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 md:py-20">
      <h1 className="text-5xl md:text-6xl font-bold text-brand-primary mb-4">dishola</h1>
      <p className="text-lg md:text-xl text-brand-text-muted mb-10 md:mb-16 max-w-2xl">
        Share the love of food, dish by dish. <br />
        The ultimate source to find real meals at real places that rule.
      </p>

      <div className="homepage-search-container mt-8 w-full max-w-2xl">
        <SearchSection
          includeTastesOption={true}
          isUserLoggedIn={!!user}
          initialQuery={q || ""}
          initialLat={lat ? parseFloat(lat) : undefined}
          initialLng={long ? parseFloat(long) : undefined}
        />
      </div>
    </div>
  )
}
