"use client"

import { AlertTriangle, Loader2, Search, SearchSlash } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState } from "react"
import DishCard from "@/components/dish-card"
import ResultsFor from "@/components/results-for"
import { Button } from "@/components/ui/button"
import { useLocationData } from "@/hooks/useLocationData"
import { useAuth } from "@/lib/auth-context"
import { API_BASE_URL } from "@/lib/constants"
import type { DishRecommendation } from "../../../api/lib/types"

function SearchResultsContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get("q")
  const lat = searchParams.get("lat")
  const long = searchParams.get("long")
  const tastesParam = searchParams.get("tastes")

  // Only allow one parameter type - q takes precedence
  const hasQuery = !!q
  const hasTastes = !hasQuery && !!tastesParam
  const tasteNames =
    hasTastes && tastesParam
      ? tastesParam
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : []

  const [aiDishes, setAiDishes] = useState<DishRecommendation[]>([])
  const [dbDishes, setDbDishes] = useState<DishRecommendation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [locationDisplayName, setLocationDisplayName] = useState<string>("")
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)
  const abortController = useRef<AbortController | null>(null)

  const { user, getUserTastes } = useAuth()

  const { neighborhood, city, isLoading: locationLoading, latitude, longitude } = useLocationData({
    urlLat: lat,
    urlLng: long
  })

  // Fetch location display name when coordinates are available
  useEffect(() => {
    if (lat && long && !locationDisplayName) {
      const fetchLocationInfo = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/location-info?lat=${lat}&lng=${long}`)
          if (response.ok) {
            const data = await response.json()
            if (data.neighborhood && data.city) {
              setLocationDisplayName(`in ${data.neighborhood}, ${data.city}`)
            } else if (data.city) {
              setLocationDisplayName(`in ${data.city}`)
            } else if (data.displayName) {
              setLocationDisplayName(`in ${data.displayName}`)
            }
          }
        } catch (error) {
          console.error("Failed to fetch location info:", error)
        }
      }
      fetchLocationInfo()
    }
  }, [lat, long, locationDisplayName])

  // Perform search when URL parameters change
  useEffect(() => {
    // Only search if we have one of the required parameters and location
    if ((hasQuery || hasTastes) && lat && long) {
      setIsSearching(true)
      setError(null)

      // Abort any existing request
      if (abortController.current) abortController.current.abort()
      abortController.current = new AbortController()

      const performSearch = async () => {
        try {
          // Build search URL
          const searchUrl = new URL(`${API_BASE_URL}/api/search`)
          searchUrl.searchParams.append("lat", lat)
          searchUrl.searchParams.append("long", long)

          // Add either q or tastes parameter (never both)
          if (hasQuery && q) {
            searchUrl.searchParams.append("q", q)
          } else if (hasTastes && tastesParam) {
            searchUrl.searchParams.append("tastes", tastesParam)
          }

          const response = await fetch(searchUrl.toString(), {
            signal: abortController.current?.signal
          })

          if (!response.ok) {
            throw new Error(`Failed to fetch search results (${response.status}). Please try again.`)
          }

          const data = await response.json()
          if (data.error) {
            throw new Error(data.error)
          }

          setAiDishes(data.aiResults || [])
          setDbDishes(data.dbResults || [])
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return
          console.error("Search API error:", err)
          setError(err instanceof Error ? err.message : "An unknown error occurred.")
        } finally {
          setIsSearching(false)
        }
      }

      performSearch()
    } else {
      // No search parameters or no location - clear results and errors
      setAiDishes([])
      setDbDishes([])
      setError(null)
      setIsSearching(false)

      // Only show error if we don't have location data
      if (!lat || !long) {
        setError("Location is required for search.")
      }
    }

    // Cleanup on unmount or param change
    return () => {
      if (abortController.current) abortController.current.abort()
    }
  }, [hasQuery, hasTastes, q, tastesParam, lat, long])

  // Only show location loading if we don't have URL coordinates and are waiting for geolocation
  const hasUrlCoordinates = !!(lat && long)
  const shouldShowLocationLoading = !hasUrlCoordinates && locationLoading

  if (shouldShowLocationLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary mb-4" />
        <p className="text-brand-text-muted">Getting your location...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 bg-red-50 border border-red-200 p-8 rounded-lg">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-700 mb-2">Oops! Something went wrong.</h2>
        <p className="text-red-600 mb-6">{error}</p>
        <Button asChild className="btn-custom-primary">
          <Link href="/">Try a new search</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Loading State */}
      {isSearching && (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-4" />
          <p className="text-brand-text-muted">
            {hasQuery 
              ? `Searching for ${q} deliciousness${locationDisplayName}...` 
              : `Finding dishes based on your tastes${locationDisplayName}...`
            }
          </p>
        </div>
      )}

      {/* Results */}
      {!isSearching && (hasQuery || hasTastes) && (
        <>
          <div className="mb-6">
            <ResultsFor neighborhood={neighborhood} city={city} />
            {/* Show taste info if we have tastes */}
            {hasTastes && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  Taste preferences: <span className="font-medium">{tasteNames.join(", ")}</span>
                </p>
              </div>
            )}
          </div>

          {aiDishes.length === 0 && dbDishes.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <SearchSlash className="h-12 w-12 text-brand-text-muted mb-4" />
              <h2 className="text-xl font-semibold text-brand-text mb-2">
                No dishes found{q ? ` for "${q}"` : hasTastes ? ` for ${tasteNames.join(", ")}` : ""}
              </h2>
              <p className="text-brand-text-muted mb-6">Try a different search term or broaden your cravings!</p>
            </div>
          ) : (
            <>
              {aiDishes.length > 0 && (
                <section className="mb-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                    {aiDishes.map((rec) => (
                      <DishCard key={`ai-${rec.id}`} recommendation={rec} />
                    ))}
                  </div>
                </section>
              )}

              {dbDishes.length > 0 && (
                <section className="mb-10">
                  <h2 className="text-2xl font-semibold text-brand-primary mb-4">Community Favorites</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                    {dbDishes.map((rec) => (
                      <DishCard key={`db-${rec.id}`} recommendation={rec} />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}

      {/* Welcome Message (no search parameters) */}
      {!isSearching && !hasQuery && !hasTastes && (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <Search className="h-16 w-16 text-brand-primary mb-6" />
          <h2 className="text-2xl font-semibold text-brand-text mb-4">Ready to discover amazing dishes?</h2>
          <p className="text-brand-text-muted mb-6 max-w-md">
            Search for specific dishes like "pasta" or "tacos" to find the best places near you.
          </p>
        </div>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <div className="flex flex-col">
      {/* Results section */}
      <Suspense fallback={<div>Loading...</div>}>
        <SearchResultsContent />
      </Suspense>
    </div>
  )
}
