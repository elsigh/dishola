"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import DishCard from "@/components/dish-card"
import SearchSection from "@/components/search-section"
import LocationDot from "@/components/ui/location-dot"
import { UserMenu } from "@/components/user-menu"
import { useAuth } from "@/lib/auth-context"
import { API_BASE_URL } from "@/lib/constants"
import type { DishRecommendation } from "../../api/lib/types"

export default function HomePage() {
  const { user, isLoading: authLoading, getAuthToken } = useAuth()
  const [tasteResults, setTasteResults] = useState<DishRecommendation[]>([])
  const [isLoadingResults, setIsLoadingResults] = useState(false)
  const [userTastes, setUserTastes] = useState<string[]>([])
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [neighborhood, setNeighborhood] = useState<string | undefined>(undefined)

  //console.debug("authLoading", authLoading)

  // Get geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords
          setLatitude(lat)
          setLongitude(lng)
        },
        (error) => {
          console.error("Geolocation error:", error)
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      )
    }
  }, [])

  // Fetch taste-based recommendations if user is signed in
  useEffect(() => {
    const fetchTasteRecommendations = async () => {
      if (!user || !latitude || !longitude) return

      try {
        setIsLoadingResults(true)
        // Get the token from the auth context
        let token: string | null = null
        try {
          token = getAuthToken()
        } catch (error) {
          console.warn("Could not get auth token:", error)
        }

        if (!token) {
          console.error("No auth token available")
          setIsLoadingResults(false)
          return
        }

        const response = await fetch(`${API_BASE_URL}/api/taste-recommendations?lat=${latitude}&long=${longitude}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setTasteResults(data.aiResults || [])
          setUserTastes(data.userTastes || [])
          setNeighborhood(data.neighborhood)
        }
      } catch (error) {
        console.error("Error fetching taste recommendations:", error)
      } finally {
        setIsLoadingResults(false)
      }
    }

    if (!authLoading && user) {
      fetchTasteRecommendations()
    }
  }, [user, authLoading, latitude, longitude])

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

        <SearchSection neighborhood={neighborhood} />

        <p className="mt-12 text-md text-brand-text-muted max-w-xl">So, what's your favorite dish?</p>
      </div>
    )
  }

  // User is signed in - show Google-style search page with results
  return (
    <div className="container mx-auto px-4 py-4">
      <div className="flex flex-col">
        <div className="flex mb-6 gap-8 items-center">
          <div className="flex-grow">
            <SearchSection includeTastesOption={true} isUserLoggedIn={true} neighborhood={neighborhood} />
          </div>
          <UserMenu />
        </div>

        {/* Results section */}
        {isLoadingResults ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-4" />
          </div>
        ) : tasteResults.length > 0 ? (
          <div>
            <div className="flex gap-2">
              <h2 className=" text-brand-primary mb-4">
                <LocationDot /> Results for <strong>{neighborhood}</strong>
              </h2>
              <span>∙</span>
              <Link href="/profile/tastes" className="text-sm text-brand-text-muted hover:text-brand-primary">
                Manage my Tastes
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
              {tasteResults.map((rec) => (
                <DishCard key={`taste-${rec.id}`} recommendation={rec} />
              ))}
            </div>
          </div>
        ) : userTastes.length > 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-brand-text-muted">
              No recommendations found based on your taste preferences.
              <br />
              Try searching for a specific dish above.
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-brand-text-muted">
              You haven't added any taste preferences yet.
              <br />
              <Link href="/profile/tastes" className="text-brand-primary hover:underline">
                Add some tastes to your profile
              </Link>{" "}
              to get personalized recommendations!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
