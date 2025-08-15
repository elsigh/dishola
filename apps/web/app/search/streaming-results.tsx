import { Suspense } from "react"
import { SearchSlash } from "lucide-react"
import AiResultsStreaming from "@/components/search/ai-results-streaming"
import DbResults, { DbResultsSkeleton } from "@/components/search/db-results"
import ResultsForClient from "@/components/results-for-client"
import SortSelector from "@/components/sort-selector"

interface StreamingResultsProps {
  searchParams: {
    q?: string
    tastes?: string
    lat?: string
    long?: string
    sort?: string
  }
  locationDisplayName: string
  neighborhood?: string
  city?: string
}

export default function StreamingResults({ 
  searchParams, 
  locationDisplayName, 
  neighborhood, 
  city 
}: StreamingResultsProps) {
  const { q, tastes, lat, long, sort = "distance" } = searchParams
  
  // Validate required parameters
  if (!lat || !long) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <SearchSlash className="h-12 w-12 text-brand-text-muted mb-4" />
        <h2 className="text-xl font-semibold text-brand-text mb-2">Location Required</h2>
        <p className="text-brand-text-muted mb-6">We need your location to find dishes near you.</p>
      </div>
    )
  }

  if (!q && !tastes) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <SearchSlash className="h-12 w-12 text-brand-text-muted mb-4" />
        <h2 className="text-xl font-semibold text-brand-text mb-2">No Search Parameters</h2>
        <p className="text-brand-text-muted mb-6">Please provide a search query or taste preferences.</p>
      </div>
    )
  }

  // Extract dish name from query or tastes for DB search
  const dishQuery = q || (tastes ? tastes.split(',').map(t => t.trim()).join(' ') : '')
  
  // Parse user coordinates for distance calculation in DishCard
  const userLat = lat ? parseFloat(lat) : undefined
  const userLng = long ? parseFloat(long) : undefined
  
  // Parse taste names for display
  const tasteNames = tastes 
    ? tastes.split(',').map(t => t.trim()).filter(Boolean)
    : []

  return (
    <>
      <div className="mb-6">
        <ResultsForClient neighborhood={neighborhood} city={city} />
        {/* Show taste info if we have tastes */}
        {tastes && (
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              Taste preferences: <span className="font-medium">{tasteNames.join(", ")}</span>
            </p>
          </div>
        )}
      </div>

      {/* Sort Selector */}
      <SortSelector currentSort={sort} />

      {/* AI Results - Primary results, shown first */}
      <AiResultsStreaming 
        query={q}
        tastes={tastes}
        lat={lat!}
        lng={long!}
        sort={sort}
        userLat={userLat}
        userLng={userLng}
      />

      {/* Database Results - Secondary results, only show if there are results */}
      <Suspense fallback={null}>
        <DbResults 
          dish={dishQuery}
          lat={lat}
          lng={long}
          sort={sort}
          userLat={userLat}
          userLng={userLng}
        />
      </Suspense>
    </>
  )
}