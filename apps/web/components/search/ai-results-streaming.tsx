"use client"

import type { DishRecommendation } from "@dishola/types"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import DishCard from "@/components/dish-card"
import { API_BASE_URL } from "@/lib/constants"

interface AiResultsStreamingProps {
  query?: string
  tastes?: string
  lat: string
  lng: string
  sort?: string
  userLat?: number
  userLng?: number
}

interface StreamingState {
  dishes: DishRecommendation[]
  isStreaming: boolean
  isCompleted: boolean
  error: string | null
  streamingStatus: string | null
  timing?: {
    totalTime: number
    timeToFirstToken: number
    avgTokensPerSecond: number
  }
}

export default function AiResultsStreaming({ 
  query, 
  tastes, 
  lat, 
  lng, 
  sort = "distance", 
  userLat, 
  userLng 
}: AiResultsStreamingProps) {
  const [state, setState] = useState<StreamingState>({
    dishes: [],
    isStreaming: false,
    isCompleted: false,
    error: null,
    streamingStatus: null
  })

  useEffect(() => {
    let abortController: AbortController | null = null
    let timeoutId: NodeJS.Timeout | null = null

    const startStreaming = async () => {
      // Reset state
      setState({
        dishes: [],
        isStreaming: true,
        isCompleted: false,
        error: null,
        streamingStatus: "Starting search..."
      })

      abortController = new AbortController()

      // Set a 60-second timeout for the entire streaming process
      timeoutId = setTimeout(() => {
        setState(prev => ({
          ...prev,
          error: "Search timed out after 60 seconds",
          isStreaming: false,
          streamingStatus: null
        }))
        if (abortController) abortController.abort()
      }, 60000)

      try {
        // Build streaming search URL (use the existing streaming endpoint)
        const searchUrl = new URL(`${API_BASE_URL}/api/search`)
        if (query) {
          searchUrl.searchParams.append("q", query)
        } else if (tastes) {
          searchUrl.searchParams.append("tastes", tastes)
        }
        searchUrl.searchParams.append("lat", lat)
        searchUrl.searchParams.append("long", lng)
        searchUrl.searchParams.append("sort", sort)

        console.log('🤖 Starting AI streaming from:', searchUrl.toString())

        const response = await fetch(searchUrl.toString(), {
          signal: abortController.signal
        })

        console.log('📡 Fetch response received:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch search results: ${response.status}`)
        }

        if (!response.body) {
          throw new Error("No response body received")
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        console.log('🔄 Starting to read stream...')
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            console.log('✅ Stream reading completed')
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          console.log('📦 Raw stream chunk received:', chunk)
          
          const lines = chunk.split('\n').filter(line => line.trim())
          console.log('📝 Parsed lines:', lines)

          for (const line of lines) {
            if (line.trim()) {
              try {
                // Parse SSE format
                let eventData
                if (line.startsWith('data: ')) {
                  eventData = JSON.parse(line.slice(6))
                } else {
                  eventData = JSON.parse(line)
                }

                console.log('🎯 AI Stream event:', eventData.type, eventData.data)

                // Skip non-AI events for cleaner AI results section
                if (['metadata', 'dbResults', 'complete'].includes(eventData.type)) {
                  continue
                }

                // Handle different event types
                switch (eventData.type) {
                  case 'aiProgress':
                    setState(prev => ({
                      ...prev,
                      streamingStatus: eventData.data.message,
                      timing: eventData.data.timeToFirstToken ? {
                        timeToFirstToken: eventData.data.timeToFirstToken,
                        totalTime: 0,
                        avgTokensPerSecond: 0
                      } : prev.timing
                    }))
                    break


                  case 'aiResults':
                    // Got all AI results - now stream them in one by one for visual effect
                    const results = eventData.data.results || []
                    const timing = eventData.data.timing

                    console.log('🍽️ Client received AI results:', {
                      resultCount: results.length,
                      results: results.map((dish: any, index: number) => ({
                        index: index + 1,
                        dishName: dish.dish?.name,
                        restaurantName: dish.restaurant?.name,
                        rating: dish.dish?.rating,
                        id: dish.id
                      })),
                      timing
                    })

                    setState(prev => ({
                      ...prev,
                      streamingStatus: "Rendering search results...",
                      timing
                    }))

                    // Stream dishes in one by one with 300ms delay for visual effect
                    for (let i = 0; i < results.length; i++) {
                      console.log(`🎨 Rendering dish ${i + 1}/${results.length}:`, results[i].dish?.name)
                      await new Promise(resolve => setTimeout(resolve, 300))
                      setState(prev => ({
                        ...prev,
                        dishes: [...prev.dishes, results[i]],
                        streamingStatus: `Rendered ${prev.dishes.length + 1} of ${results.length} recommendations...`
                      }))
                    }

                    console.log('✅ All AI results rendered')

                    // Mark as completed
                    setState(prev => ({
                      ...prev,
                      isStreaming: false,
                      isCompleted: true,
                      streamingStatus: null
                    }))
                    break

                  case 'error':
                  case 'aiError':
                    console.error('AI Error received:', eventData.data)
                    setState(prev => ({
                      ...prev,
                      error: eventData.data.message || 'Search failed',
                      isStreaming: false,
                      streamingStatus: null
                    }))
                    break
                  
                  default:
                    console.log('Unhandled event type:', eventData.type, eventData.data)
                    break
                }
              } catch (parseError) {
                console.warn('Failed to parse stream data:', line, parseError)
              }
            }
          }
        }
      } catch (error) {
        console.error('AI streaming error:', error)
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          streamingStatus: null
        }))
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
      }
    }

    startStreaming()

    return () => {
      if (abortController) {
        abortController.abort()
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [query, tastes, lat, lng, sort])

  if (state.error) {
    return (
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <h2 className="text-2xl font-semibold text-brand-primary">Search Results</h2>
        </div>
        <div className="text-center py-8 text-red-600">
          <p>Error loading search results: {state.error}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mb-10">
      <div className="flex items-center mb-4">
        <h2 className="text-2xl font-semibold text-brand-primary">Search Results</h2>
        {state.isStreaming && (
          <Loader2 className="h-4 w-4 animate-spin text-brand-primary ml-3" />
        )}
      </div>

      {/* Show timing and progress info */}
      {(state.streamingStatus || state.timing) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          {state.streamingStatus && (
            <p className="text-sm text-blue-700">{state.streamingStatus}</p>
          )}
          {state.timing && (
            <p className="text-xs text-blue-600 mt-1">
              {state.timing.totalTime > 0 ? 
                `Completed in ${state.timing.totalTime}ms (${state.timing.avgTokensPerSecond} tokens/sec)` :
                state.timing.timeToFirstToken > 0 ? `First response: ${state.timing.timeToFirstToken}ms` : ''
              }
            </p>
          )}
        </div>
      )}

      {/* Render dishes as they come in */}
      {state.dishes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
          {state.dishes.map((dish, index) => (
            <div
              key={`ai-streaming-${dish.id}`}
              className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <DishCard 
                recommendation={dish} 
                userLat={userLat}
                userLng={userLng}
              />
            </div>
          ))}
        </div>
      )}

      {/* Show loading state when no dishes yet */}
      {state.dishes.length === 0 && state.isStreaming && (
        <div className="text-center py-8 text-brand-text-muted">
          <p>Generating personalized recommendations...</p>
        </div>
      )}

      {/* Show completion message */}
      {state.isCompleted && state.dishes.length === 0 && (
        <div className="text-center py-8 text-brand-text-muted">
          <p>No search results available at the moment</p>
        </div>
      )}
    </section>
  )
}