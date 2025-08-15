"use client"

import type { DishRecommendation } from "@dishola/types"
import { AlertTriangle, Loader2, Search, SearchSlash } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import DishCard from "@/components/dish-card"
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
  // Initialize isSearching to true if we have search parameters
  const [isSearching, setIsSearching] = useState(() => {
    return !!(hasQuery || hasTastes) && !!(lat && long)
  })
  const [hasSearched, setHasSearched] = useState(false)
  
  // Streaming state
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null)
  const [aiProgress, setAiProgress] = useState<{ message: string; timing?: any } | null>(null)
  const [dbResultsReceived, setDbResultsReceived] = useState(false)
  const [aiResultsReceived, setAiResultsReceived] = useState(false)
  
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null)
  const abortController = useRef<AbortController | null>(null)

  const { user, getUserTastes } = useAuth()

  // Streaming search handler
  const handleStreamingSearch = async (searchUrl: string, abortController: AbortController | null) => {
    console.log('🚀 handleStreamingSearch started with URL:', searchUrl)
    
    // Reset streaming state
    setStreamingStatus("Starting search...")
    setAiProgress(null)
    setDbResultsReceived(false)
    setAiResultsReceived(false)
    setAiDishes([])
    setDbDishes([])

    const response = await fetch(searchUrl, {
      signal: abortController?.signal
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch search results (${response.status}). Please try again.`)
    }

    if (!response.body) {
      throw new Error("No response body received")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        console.log('Raw chunk received:', chunk)
        
        const lines = chunk.split('\n').filter(line => line.trim())
        console.log('Parsed lines:', lines)

        for (const line of lines) {
          if (line.trim()) {
            try {
              // H3's createEventStream sends direct JSON, not SSE format
              const data = JSON.parse(line)
              await handleStreamEvent(data)
            } catch (parseError) {
              // Try SSE format as fallback
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  await handleStreamEvent(data)
                } catch (sseParseError) {
                  console.warn('Failed to parse stream data:', line, parseError, sseParseError)
                }
              } else {
                console.warn('Failed to parse stream data:', line, parseError)
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
    console.log('Stream event:', event.type, event.data)

    switch (event.type) {
      case 'metadata':
        setStreamingStatus('Search initialized')
        break

      case 'dbResults':
        setDbDishes(event.data)
        setDbResultsReceived(true)
        setStreamingStatus('Database results loaded')
        break

      case 'aiProgress':
        setAiProgress({
          message: event.data.message,
          timing: event.data.timeToFirstToken ? { timeToFirstToken: event.data.timeToFirstToken } : undefined
        })
        setStreamingStatus(event.data.message)
        break

      case 'aiResults':
        setAiDishes(event.data.results)
        setAiResultsReceived(true)
        setAiProgress({
          message: `AI recommendations completed`,
          timing: event.data.timing
        })
        setStreamingStatus('AI recommendations completed')
        break

      case 'complete':
        setStreamingStatus('Search complete')
        break

      case 'aiError':
        console.error('AI recommendation error:', event.data)
        setAiProgress({ message: `AI error: ${event.data.message}` })
        break

      case 'error':
        throw new Error(event.data.message || 'Streaming search failed')
    }
  }

  // Use server-provided location data when available, fallback to client-side hook
  const {
    neighborhood: hookNeighborhood,
    city: hookCity,
    isLoading: locationLoading,
    latitude,
    longitude
  } = useLocationData({
    urlLat: lat,
    urlLng: long
  })

  // Prefer server-provided data over client-side data
  const finalNeighborhood = neighborhood || hookNeighborhood
  const finalCity = city || hookCity

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
        console.log('🔍 performSearch called with:', { hasQuery, hasTastes, lat, long, q, tastesParam })
        
        if (abortController.current) {
          abortController.current.abort()
        }

        abortController.current = new AbortController()
        setError(null)
        setIsSearching(true)

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

          // Add sort parameter
          searchUrl.searchParams.append("sort", sortParam)

          console.log('🌐 Calling streaming search with URL:', searchUrl.toString())
          
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

      performSearch()
    } else {
      // No search parameters or no location - clear results and errors
      setAiDishes([])
      setDbDishes([])
      setError(null)
      setIsSearching(false)
      setHasSearched(false)

      // Only show error if we don't have location data
      if (!lat || !long) {
        setError("Location is required for search.")
      }
    }

    // Cleanup on unmount or param change
    return () => {
      if (abortController.current) abortController.current.abort()
    }
  }, [hasQuery, hasTastes, q, tastesParam, lat, long, sortParam])

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

  // Show loading state only if we're searching and haven't received any results yet
  const shouldShowLoading = isSearching && !dbResultsReceived && !aiResultsReceived && !error

  return (
    <div>
      {/* Loading State with Streaming Progress */}
      {shouldShowLoading && (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary mb-4" />
          <div className="space-y-2">
            <p className="text-brand-text-muted">
              {hasQuery
                ? `Searching for ${sortParam === "rating" ? "top-rated" : "nearby"} ${q} deliciousness ${locationDisplayName}...`
                : `Finding ${sortParam === "rating" ? "top-rated" : "nearby"} deliciousness ${locationDisplayName}...`}
            </p>
            
            {streamingStatus && (
              <p className="text-sm text-brand-text-muted/75">
                {streamingStatus}
              </p>
            )}

            {aiProgress?.timing?.timeToFirstToken && (
              <p className="text-xs text-brand-text-muted/60">
                First response in {aiProgress.timing.timeToFirstToken}ms
              </p>
            )}
          </div>

          {/* Progressive loading indicators */}
          <div className="mt-6 flex items-center space-x-4 text-xs text-brand-text-muted">
            <div className="flex items-center space-x-2">
              {dbResultsReceived ? (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              ) : (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              <span>Database</span>
            </div>
            <div className="flex items-center space-x-2">
              {aiResultsReceived ? (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              ) : (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              <span>AI Recommendations</span>
            </div>
          </div>
        </div>
      )}

      {/* Results - Show immediately when available, even while streaming */}
      {(dbResultsReceived || aiResultsReceived || hasSearched) && (hasQuery || hasTastes) && (
        <>
          <div className="mb-6">
            <ResultsFor neighborhood={finalNeighborhood} city={finalCity} />
            {/* Show taste info if we have tastes */}
            {hasTastes && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">
                  Taste preferences: <span className="font-medium">{tasteNames.join(", ")}</span>
                </p>
              </div>
            )}
          </div>

          {/* Sort Selector - only show if we have results */}
          {(aiDishes.length > 0 || dbDishes.length > 0) && <SortSelector currentSort={sortParam} />}

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
              {/* AI Results Section */}
              {(aiDishes.length > 0 || (isSearching && !aiResultsReceived)) && (
                <section className="mb-10">
                  <div className="flex items-center mb-4">
                    <h2 className="text-2xl font-semibold text-brand-primary">AI Recommendations</h2>
                    {!aiResultsReceived && isSearching && (
                      <Loader2 className="h-4 w-4 animate-spin text-brand-primary ml-3" />
                    )}
                  </div>
                  
                  {aiProgress && !aiResultsReceived && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">{aiProgress.message}</p>
                      {aiProgress.timing && (
                        <p className="text-xs text-blue-600 mt-1">
                          {aiProgress.timing.totalTime ? 
                            `Completed in ${aiProgress.timing.totalTime}ms (${aiProgress.timing.avgTokensPerSecond} tokens/sec)` :
                            aiProgress.timing.timeToFirstToken ? `First response: ${aiProgress.timing.timeToFirstToken}ms` : ''
                          }
                        </p>
                      )}
                    </div>
                  )}

                  {aiDishes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                      {aiDishes.map((rec) => (
                        <DishCard key={`ai-${rec.id}`} recommendation={rec} />
                      ))}
                    </div>
                  ) : (isSearching && !aiResultsReceived) ? (
                    <div className="text-center py-8 text-brand-text-muted">
                      <p>Generating personalized recommendations...</p>
                    </div>
                  ) : null}
                </section>
              )}

              {/* Database Results Section */}
              {(dbDishes.length > 0 || (isSearching && !dbResultsReceived)) && (
                <section className="mb-10">
                  <div className="flex items-center mb-4">
                    <h2 className="text-2xl font-semibold text-brand-primary">Community Favorites</h2>
                    {!dbResultsReceived && isSearching && (
                      <Loader2 className="h-4 w-4 animate-spin text-brand-primary ml-3" />
                    )}
                  </div>

                  {dbDishes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                      {dbDishes.map((rec) => (
                        <DishCard key={`db-${rec.id}`} recommendation={rec} />
                      ))}
                    </div>
                  ) : (isSearching && !dbResultsReceived) ? (
                    <div className="text-center py-8 text-brand-text-muted">
                      <p>Loading community favorites...</p>
                    </div>
                  ) : null}
                </section>
              )}
            </>
          )}
        </>
      )}

      {/* Welcome Message (no search parameters) */}
      {!shouldShowLoading && !hasQuery && !hasTastes && (
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
