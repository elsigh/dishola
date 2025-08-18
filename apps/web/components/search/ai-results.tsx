import type { DishRecommendation } from "@dishola/types"
import { Loader2 } from "lucide-react"
import DishCard from "@/components/dish-card"
import { API_BASE_URL } from "@/lib/constants"

interface AiResultsProps {
  query?: string
  tastes?: string
  lat: string
  lng: string
  sort?: string
  userLat?: number
  userLng?: number
}

async function getAiResults(
  query: string | undefined,
  tastes: string | undefined,
  lat: string,
  lng: string,
  sort = "distance"
) {
  const searchUrl = new URL(`${API_BASE_URL}/api/search/ai`)

  if (query) {
    searchUrl.searchParams.append("q", query)
  } else if (tastes) {
    searchUrl.searchParams.append("tastes", tastes)
  } else {
    throw new Error("Either query or tastes parameter is required")
  }

  searchUrl.searchParams.append("lat", lat)
  searchUrl.searchParams.append("long", lng)
  searchUrl.searchParams.append("sort", sort)

  const response = await fetch(searchUrl.toString(), {
    // Enable caching but shorter duration since AI results can vary
    next: { revalidate: 60 } // Cache for 1 minute
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch AI results: ${response.status}`)
  }

  return response.json()
}

export default async function AiResults({ query, tastes, lat, lng, sort, userLat, userLng }: AiResultsProps) {
  try {
    const data = await getAiResults(query, tastes, lat, lng, sort)
    const results: DishRecommendation[] = data.results || []

    if (results.length === 0) {
      return (
        <section className="mb-10">
          <div className="flex items-center mb-4">
            <h2 className="text-2xl font-semibold text-brand-primary">AI Recommendations</h2>
          </div>
          <div className="text-center py-8 text-brand-text-muted">
            <p>No AI recommendations available at the moment</p>
          </div>
        </section>
      )
    }

    return (
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <h2 className="text-2xl font-semibold text-brand-primary">AI Recommendations</h2>
        </div>

        {/* Show timing info if available */}
        {data.timing && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              AI recommendations completed in {data.timing.totalTime}ms ({data.timing.avgTokensPerSecond} tokens/sec)
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
          {results.map((rec) => (
            <DishCard key={`ai-${rec.id}`} recommendation={rec} userLat={userLat} userLng={userLng} />
          ))}
        </div>
      </section>
    )
  } catch (error) {
    console.error("AI search error:", error)
    return (
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <h2 className="text-2xl font-semibold text-brand-primary">AI Recommendations</h2>
        </div>
        <div className="text-center py-8 text-red-600">
          <p>Error generating AI recommendations. Please try again.</p>
        </div>
      </section>
    )
  }
}

export function AiResultsSkeleton() {
  return (
    <section className="mb-10">
      <div className="flex items-center mb-4">
        <h2 className="text-2xl font-semibold text-brand-primary">AI Recommendations</h2>
        <Loader2 className="h-4 w-4 animate-spin text-brand-primary ml-3" />
      </div>
      <div className="text-center py-8 text-brand-text-muted">
        <p>Generating personalized recommendations...</p>
      </div>
    </section>
  )
}
