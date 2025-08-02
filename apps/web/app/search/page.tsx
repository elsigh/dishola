"use client"

import { Loader as GoogleMapsLoader } from "@googlemaps/js-api-loader"
import { AlertTriangle, Loader2, SearchSlash } from "lucide-react"
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

  // Determine includeTastes based on the presence of q
  const includeTastes = !q

  const [aiDishes, setAiDishes] = useState<DishRecommendation[]>([])
  const [dbDishes, setDbDishes] = useState<DishRecommendation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [displayLocation, setDisplayLocation] = useState<string>("")
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)
  const abortController = useRef<AbortController | null>(null)

  const { user, getAuthToken } = useAuth()
  const [userTastes, setUserTastes] = useState<string[]>([])

  const [mapOpen, setMapOpen] = useState(false)
  const [tempLat, setTempLat] = useState<number | null>(null)
  const [tempLng, setTempLng] = useState<number | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  const { neighborhood, city, isLoading } = useLocationData()

  // Google Maps modal logic
  useEffect(() => {
    if (mapOpen && mapRef.current && tempLat !== null && tempLng !== null) {
      const loader = new GoogleMapsLoader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        version: "weekly"
      })
      let map: google.maps.Map
      let marker: google.maps.Marker
      loader.load().then(() => {
        map = new google.maps.Map(mapRef.current!, {
          center: { lat: tempLat, lng: tempLng },
          zoom: 13
        })
        marker = new google.maps.Marker({
          position: { lat: tempLat, lng: tempLng },
          map,
          draggable: false
        })
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const lat = e.latLng.lat()
            const lng = e.latLng.lng()
            marker.setPosition({ lat, lng })
            setTempLat(lat)
            setTempLng(lng)
          }
        })
      })
      return () => {
        /* cleanup */
      }
    }
  }, [mapOpen, tempLat, tempLng])

  // Update useEffect to listen for changes in the search query
  useEffect(() => {
    // Allow search with just lat/long and includeTastes (for taste-based recommendations)
    if ((q !== null || includeTastes) && lat && long) {
      // setIsLoading(true) // This line is removed
      setError(null)
      // Debounce the fetch
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
      if (abortController.current) abortController.current.abort()
      debounceTimeout.current = setTimeout(async () => {
        abortController.current = new AbortController()

        try {
          // Build search URL
          const searchUrl = new URL(`${API_BASE_URL}/api/search`)

          // Add query param if present
          if (q) {
            searchUrl.searchParams.append("q", q)
          }

          searchUrl.searchParams.append("lat", lat)
          searchUrl.searchParams.append("long", long)

          // Remove includeTastes param from search URL
          // searchUrl.searchParams.append("includeTastes", "true")

          // Prepare headers
          const headers: HeadersInit = {}

          // Add auth token if user is signed in and includeTastes is enabled
          if (includeTastes && user) {
            try {
              const token = getAuthToken()
              if (token) {
                headers["Authorization"] = `Bearer ${token}`
              }
            } catch (error) {
              console.warn("Could not get auth token:", error)
            }
          }

          const response = await fetch(searchUrl.toString(), {
            signal: abortController.current.signal,
            headers
          })

          if (!response.ok) {
            throw new Error("Failed to fetch search results. Please try again.")
          }

          const data = await response.json()

          if (data.error) {
            throw new Error(data.error)
          }

          setAiDishes(data.aiResults || [])
          setDbDishes(data.dbResults || [])
          setDisplayLocation(data.displayLocation || "")
          console.log("API Response:", data)
          // setNeighborhood(data.neighborhood) // This line is removed
          console.log("Neighborhood set to:", data.neighborhood)
          // setCity(data.city) // This line is removed
          console.log("City set to:", data.city)
          if (data.includedTastes) {
            setUserTastes(data.includedTastes)
          }
          // setIsLoading(false) // This line is removed
        } catch (err) {
          if (err instanceof Error) {
            if (err.name === "AbortError") return
            console.error("Search API error:", err)
            setError(err.message || "An unknown error occurred.")
          } else {
            console.error("An unexpected error occurred:", err)
            setError("An unknown error occurred.")
          }
          // setIsLoading(false) // This line is removed
        }
      }, 300)
    } else {
      if (includeTastes) {
        setError("Location is required for taste-based recommendations.")
      } else {
        setError("Search query and location are required.")
      }
      // setIsLoading(false) // This line is removed
    }
    // Cleanup on unmount or param change
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
      if (abortController.current) abortController.current.abort()
    }
  }, [q, lat, long, includeTastes, user])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary mb-4" />
        <p className="text-brand-text-muted">
          {q
            ? `Searching for ${q} deliciousness...`
            : includeTastes
              ? "Finding dishes based on your location and tastes..."
              : "Searching..."}
        </p>
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

  if (aiDishes.length === 0 && dbDishes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <SearchSlash className="h-12 w-12 text-brand-text-muted mb-4" />
        <h2 className="text-xl font-semibold text-brand-text mb-2">No dishes found for &quot;{q}&quot;</h2>
        <p className="text-brand-text-muted mb-6">Try a different search term or broaden your cravings!</p>
        <Button asChild className="btn-custom-primary">
          <Link href="/">Try a new search</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      {q && <ResultsFor neighborhood={neighborhood} city={city} />}

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
      <Button onClick={() => setMapOpen(true)}>Set Location</Button>
      {mapOpen && <div ref={mapRef} style={{ width: "100%", height: "400px" }} />}
    </div>
  )
}

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-4">
      <div className="flex flex-col">
        {/* Results section */}
        <Suspense fallback={<div>Loading...</div>}>
          <SearchResultsContent />
        </Suspense>
      </div>
    </div>
  )
}
