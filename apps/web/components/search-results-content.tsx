"use client"

import type { DishRecommendation } from "@dishola/types"
import { AlertTriangle, Loader2, Search, SearchSlash } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import DishCard from "@/components/dish-card"
import DishCardSkeleton from "@/components/dish-card-skeleton"
import ResultsFor from "@/components/results-for"
import SortSelector from "@/components/sort-selector"
import { Button } from "@/components/ui/button"
import { useLocationData } from "@/hooks/useLocationData"
import { useAuth } from "@/lib/auth-context"
import { API_BASE_URL } from "@/lib/constants"

interface SearchResultsContentProps {
  locationDisplayName: string
  neighborhood?: string
  city?: string
}

export default function SearchResultsContent({ locationDisplayName, neighborhood, city }: SearchResultsContentProps) {
  const searchParams = useSearchParams()
  const q = searchParams.get("q")
  const lat = searchParams.get("lat")
  const long = searchParams.get("long")
  const tastesParam = searchParams.get("tastes")
  const sortParam = searchParams.get("sort") || "distance"

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

  // Merge results without client-side sorting - server handles sorting
  const allDishes = [
    ...aiDishes.map((dish) => ({ ...dish, source: "ai" as const })),
    ...dbDishes.map((dish) => ({ ...dish, source: "db" as const }))
  ]
  // Initialize isSearching to true if we have search parameters
  const [isSearching, setIsSearching] = useState(() => {
    return !!(hasQuery || hasTastes) && !!(lat && long)
  })
  const [hasSearched, setHasSearched] = useState(false)

  // Streaming state
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null)
  const [aiProgress, setAiProgress] = useState<{ message: string; timing?: any; error?: boolean; errorType?: string; originalError?: string } | null>(null)
  const [dbResultsReceived, setDbResultsReceived] = useState(false)
  const [aiResultsReceived, setAiResultsReceived] = useState(false)
  const [timeToFirstDish, setTimeToFirstDish] = useState<number | null>(null)
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null)

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)
  const abortController = useRef<AbortController | null>(null)
  const searchStartTimeRef = useRef<number | null>(null)

  const { user, getUserTastes } = useAuth()

  // Streaming search handler
  const handleStreamingSearch = async (searchUrl: string, abortController: AbortController | null) => {
    console.log("🚀 handleStreamingSearch started with URL:", searchUrl)

    // Set start time immediately in ref for sync access
    const startTime = Date.now()
    searchStartTimeRef.current = startTime
    console.log("🔍 Set searchStartTimeRef to:", startTime)

    // Reset streaming state
    setStreamingStatus("Starting search...")
    setAiProgress(null)
    setDbResultsReceived(false)
    setAiResultsReceived(false)
    setAiDishes([])
    setDbDishes([])
    setTimeToFirstDish(null)
    setSearchStartTime(startTime)

    if (!abortController) {
      console.error("No abort controller provided")
      setIsSearching(false)
      setError("Search failed to initialize")
      return
    }

    const response = await fetch(searchUrl, { signal: abortController.signal })
    const reader = response.body?.getReader()

    if (!reader) {
      throw new Error("No response body reader available")
    }

    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        console.log("Raw chunk received:", chunk)

        const lines = chunk.split("\n").filter((line) => line.trim())
        console.log("Parsed lines:", lines)

        for (const line of lines) {
          if (line.trim()) {
            try {
              // H3's createEventStream sends direct JSON, not SSE format
              const data = JSON.parse(line)
              await handleStreamEvent(data)
            } catch (parseError) {
              // Try SSE format as fallback
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6))
                  await handleStreamEvent(data)
                } catch (sseParseError) {
                  console.warn("Failed to parse stream data:", line, parseError, sseParseError)
                }
              } else {
                console.warn("Failed to parse stream data:", line, parseError)
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
      setIsSearching(false)
      setHasSearched(true)
      setStreamingStatus(null)
    }
  }

  // Handle individual stream events
  const handleStreamEvent = async (event: any) => {
    console.log("Stream event:", event.type, event.data)

    switch (event.type) {
      case "metadata":
        setStreamingStatus("Search initialized")
        break

      case "dbResults":
        setDbDishes(event.data)
        setDbResultsReceived(true)
        setStreamingStatus("Database results loaded")
        break

      case "aiProgress":
        setAiProgress({
          message: event.data.message,
          timing: event.data.timeToFirstToken ? { timeToFirstToken: event.data.timeToFirstToken } : undefined
        })
        setStreamingStatus(event.data.message)
        break

      case "aiDish":
        // Handle individual streaming dishes
        setAiDishes((prev) => {
          const newDish = event.data.dish
          const exists = prev.some(
            (dish) => dish.dish.name === newDish.dish.name && dish.restaurant.name === newDish.restaurant.name
          )
          if (exists) return prev

          // Track time to first dish using ref for immediate access
          console.log("🍽️ TTFD check:", {
            prevLength: prev.length,
            searchStartTimeRef: searchStartTimeRef.current,
            timeToFirstDish
          })
          if (prev.length === 0 && searchStartTimeRef.current && !timeToFirstDish) {
            const ttfd = Date.now() - searchStartTimeRef.current
            setTimeToFirstDish(ttfd)
            console.log(`🍽️ TTFD calculated: ${ttfd}ms = ${(ttfd / 1000).toFixed(1)}s`)
          }

          return [...prev, newDish]
        })
        break

      case "aiResults":
        // Handle final batch results (fallback for cached responses)
        setAiDishes((prev) => {
          // Only replace if we haven't received streaming dishes
          if (prev.length === 0) {
            // Track TTFD for batch results using ref
            if (searchStartTimeRef.current && !timeToFirstDish) {
              const ttfd = Date.now() - searchStartTimeRef.current
              setTimeToFirstDish(ttfd)
              console.log(`🍽️ TTFD (batch): ${ttfd}ms = ${(ttfd / 1000).toFixed(1)}s`)
            }
            return event.data.results
          }
          return prev
        })
        setAiResultsReceived(true)
        setAiProgress({
          message: `AI recommendations completed`,
          timing: event.data.timing
        })
        setStreamingStatus("AI recommendations completed")
        break

      case "complete":
        setStreamingStatus("Search complete")
        break

      case "aiError":
        console.error("AI recommendation error:", event.data)
        // Set both error state and aiProgress for comprehensive error display
        setError(event.data.message || "AI recommendation failed")
        setAiProgress({ 
          message: event.data.message || "AI recommendation failed",
          error: true,
          errorType: event.data.errorType,
          originalError: event.data.originalError
        })
        break

      case "error":
        throw new Error(event.data.message || "Streaming search failed")
    }
  }

  // Use server-provided location data when available, fallback to client-side hook
  const {
    neighborhood: hookNeighborhood,
    city: hookCity,
    isLoading: locationLoading
  } = useLocationData({ urlLat: lat, urlLng: long })

  const finalNeighborhood = neighborhood || hookNeighborhood
  const finalCity = city || hookCity

  // Main search effect
  useEffect(() => {
    if ((hasQuery || hasTastes) && lat && long) {
      // Clear existing timeout
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current)

      // Abort any existing request
      if (abortController.current) abortController.current.abort()
      abortController.current = new AbortController()

      const performSearch = async () => {
        console.log("🔍 performSearch called with:", { hasQuery, hasTastes, lat, long, q, tastesParam })

        // Only clear results and set searching state when we actually start searching
        const startTime = Date.now()
        searchStartTimeRef.current = startTime
        console.log("🔍 Setting searchStartTime to:", startTime)
        setIsSearching(true)
        setError(null)
        setAiDishes([])
        setDbDishes([])
        setDbResultsReceived(false)
        setAiResultsReceived(false)
        setHasSearched(false)
        setTimeToFirstDish(null)
        setSearchStartTime(startTime)

        if (abortController.current) {
          abortController.current.abort()
        }

        abortController.current = new AbortController()

        try {
          const searchUrl = new URL(`${API_BASE_URL}/api/search`)
          searchUrl.searchParams.append("lat", lat)
          searchUrl.searchParams.append("long", long)

          if (hasQuery && q) {
            searchUrl.searchParams.append("q", q)
          } else if (hasTastes && tastesParam) {
            searchUrl.searchParams.append("tastes", tastesParam)
          }

          // Add sort parameter
          searchUrl.searchParams.append("sort", sortParam)

          console.log("🌐 Calling streaming search with URL:", searchUrl.toString())

          // Enable streaming for progressive results
          await handleStreamingSearch(searchUrl.toString(), abortController.current)
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") return
          console.error("Search API error:", err)
          setError(err instanceof Error ? err.message : "An unknown error occurred.")
          setHasSearched(true)
        } finally {
          setIsSearching(false)
        }
      }

      // Debounce the search
      debounceTimeout.current = setTimeout(performSearch, 300)
    } else {
      setIsSearching(false)
      setHasSearched(false)
    }

    // Cleanup function
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current)
      if (abortController.current) abortController.current.abort()
    }
  }, [hasQuery, hasTastes, lat, long, q, tastesParam, sortParam])

  // Show location loading if we need location but don't have it and it's loading
  const shouldShowLocationLoading = !lat || !long || (locationLoading && !finalNeighborhood && !finalCity)

  if (shouldShowLocationLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary mb-4" />
        <p className="text-brand-text-muted">Getting your location...</p>
      </div>
    )
  }

  if (error) {
    const isRateLimit = error.includes("rate limit") || error.includes("Cost limit exceeded")
    
    return (
      <div className={`flex flex-col items-center justify-center text-center py-20 p-8 rounded-lg ${
        isRateLimit 
          ? "bg-yellow-50 border border-yellow-200" 
          : "bg-red-50 border border-red-200"
      }`}>
        <AlertTriangle className={`h-12 w-12 mb-4 ${
          isRateLimit ? "text-yellow-500" : "text-red-500"
        }`} />
        <h2 className={`text-xl font-semibold mb-2 ${
          isRateLimit ? "text-yellow-700" : "text-red-700"
        }`}>
          {isRateLimit ? "Rate Limit Reached" : "Oops! Something went wrong."}
        </h2>
        <p className={`mb-6 ${
          isRateLimit ? "text-yellow-600" : "text-red-600"
        }`}>
          {error}
        </p>
        {isRateLimit && (
          <p className="text-sm text-yellow-600 mb-4">
            This usually resolves quickly. Please wait a moment before trying again.
          </p>
        )}
        <Button asChild className="btn-custom-primary">
          <Link href="/">Try a new search</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Results Section */}
      {(hasSearched || dbResultsReceived || aiResultsReceived || isSearching) && (
        <>
          {/* Sort Selector and Results For */}
          {(allDishes.length > 0 || (!isSearching && hasSearched) || isSearching) && (
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 gap-4 px-2">
              <div className="flex-1">
                <ResultsFor
                  neighborhood={finalNeighborhood}
                  city={finalCity}
                  showTastesLink={hasTastes}
                  isSearching={isSearching}
                  searchQuery={hasQuery ? q : undefined}
                  searchType={sortParam}
                  aiProgress={aiProgress}
                  timeToFirstDish={timeToFirstDish}
                />
              </div>
              <div className="flex-shrink-0">
                <SortSelector currentSort={sortParam} />
              </div>
            </div>
          )}

          {/* Results or Skeletons */}
          <section className="mb-10">
            {allDishes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                {allDishes.map((dish) => (
                  <DishCard
                    key={`${dish.source}-${dish.id}`}
                    recommendation={dish}
                    userLat={lat ? parseFloat(lat) : undefined}
                    userLng={long ? parseFloat(long) : undefined}
                  />
                ))}
              </div>
            ) : isSearching ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                {[...Array(10)].map((_, _i) => (
                  <DishCardSkeleton key={`skeleton-${Date.now()}-${Math.random()}`} />
                ))}
              </div>
            ) : null}
          </section>
        </>
      )}

      {/* No Results Found */}
      {!isSearching && hasSearched && allDishes.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center text-center py-20">
          <SearchSlash className="h-16 w-16 text-gray-400 mb-6" />
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">No dishes found</h2>
          <p className="text-gray-500 mb-6 max-w-md">
            {hasQuery
              ? `We couldn't find any "${q}" dishes ${locationDisplayName}. Try searching for something else or expanding your search area.`
              : `We couldn't find any dishes matching your tastes ${locationDisplayName}. Try searching for a specific dish instead.`}
          </p>
          <Button asChild className="btn-custom-primary">
            <Link href="/">Try a new search</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
