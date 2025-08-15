import type { DishRecommendation } from "@dishola/types"
import { Loader2 } from "lucide-react"
import DishCard from "@/components/dish-card"
import { API_BASE_URL } from "@/lib/constants"

interface DbResultsProps {
  dish: string
  lat: string
  lng: string
  sort?: string
  userLat?: number
  userLng?: number
}

async function getDbResults(dish: string, lat: string, lng: string, sort = "distance") {
  const searchUrl = new URL(`${API_BASE_URL}/api/search/db`)
  searchUrl.searchParams.append("dish", dish)
  searchUrl.searchParams.append("lat", lat)
  searchUrl.searchParams.append("long", lng)
  searchUrl.searchParams.append("sort", sort)

  const response = await fetch(searchUrl.toString(), {
    // Enable caching for faster subsequent loads
    next: { revalidate: 300 } // Cache for 5 minutes
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch database results: ${response.status}`)
  }

  return response.json()
}

export default async function DbResults({ dish, lat, lng, sort, userLat, userLng }: DbResultsProps) {
  try {
    const data = await getDbResults(dish, lat, lng, sort)
    const results: DishRecommendation[] = data.results || []

    if (results.length === 0) {
      // Don't render anything if no community results
      return null
    }

    return (
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <h2 className="text-2xl font-semibold text-brand-primary">Community Favorites</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
          {results.map((rec) => (
            <DishCard 
              key={`db-${rec.id}`} 
              recommendation={rec} 
              userLat={userLat}
              userLng={userLng}
            />
          ))}
        </div>
      </section>
    )
  } catch (error) {
    console.error('Database search error:', error)
    return (
      <section className="mb-10">
        <div className="flex items-center mb-4">
          <h2 className="text-2xl font-semibold text-brand-primary">Community Favorites</h2>
        </div>
        <div className="text-center py-8 text-red-600">
          <p>Error loading community favorites. Please try again.</p>
        </div>
      </section>
    )
  }
}

export function DbResultsSkeleton() {
  return (
    <section className="mb-10">
      <div className="flex items-center mb-4">
        <h2 className="text-2xl font-semibold text-brand-primary">Community Favorites</h2>
        <Loader2 className="h-4 w-4 animate-spin text-brand-primary ml-3" />
      </div>
      <div className="text-center py-8 text-brand-text-muted">
        <p>Loading community favorites...</p>
      </div>
    </section>
  )
}