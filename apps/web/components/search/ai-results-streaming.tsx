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

    const startStreaming = async () => {
      // Reset state
      setState({
        dishes: [],
        isStreaming: true,
        isCompleted: false,
        error: null,
        streamingStatus: "Starting AI search..."
      })

      abortController = new AbortController()

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

        if (!response.ok) {
          throw new Error(`Failed to fetch AI results: ${response.status}`)
        }

        if (!response.body) {
          throw new Error("No response body received")
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n').filter(line => line.trim())

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

                // Handle different event types
                switch (eventData.type) {
                  case 'metadata':
                    setState(prev => ({
                      ...prev,
                      streamingStatus: "AI search initialized"
                    }))
                    break

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

                  case 'aiDish':
                    // Individual dish streaming - add immediately as they come in
                    const dish = eventData.data.dish
                    console.log('🍽️ Streaming individual dish:', dish.dish.name)
                    
                    setState(prev => {
                      // Avoid duplicates by checking if dish already exists
                      const isDuplicate = prev.dishes.some(existing => existing.id === dish.id)
                      if (isDuplicate) return prev
                      
                      return {
                        ...prev,
                        dishes: [...prev.dishes, dish],
                        streamingStatus: `Found ${prev.dishes.length + 1} recommendations...`
                      }
                    })
                    break

                  case 'aiResults':
                    // Final results - update timing and mark as completed
                    const timing = eventData.data.timing

                    setState(prev => ({
                      ...prev,
                      streamingStatus: "AI recommendations completed",
                      timing,
                      isStreaming: false,
                      isCompleted: true
                    }))
                    break

                  case 'complete':
                    setState(prev => ({
                      ...prev,
                      isStreaming: false,
                      isCompleted: true,
                      streamingStatus: null
                    }))
                    break

                  case 'error':
                  case 'aiError':
                    throw new Error(eventData.data.message || 'AI streaming failed')
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
      }
    }

    startStreaming()

    return () => {
      if (abortController) {
        abortController.abort()
      }
    }
  }, [query, tastes, lat, lng, sort])

  if (state.error) {
    return (
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <h2 className="text-2xl font-semibold text-brand-primary">AI Recommendations</h2>
        </div>
        <div className="text-center py-8 text-red-600">
          <p>Error generating AI recommendations: {state.error}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="mb-10">
      <div className="flex items-center mb-4">
        <h2 className="text-2xl font-semibold text-brand-primary">AI Recommendations</h2>
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
          <p>No AI recommendations available at the moment</p>
        </div>
      )}
    </section>
  )
}