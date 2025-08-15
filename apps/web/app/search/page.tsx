import { Loader2, Search } from "lucide-react"
import { Suspense } from "react"
import { getLocationInfo } from "@/lib/location-utils"
import StreamingResults from "./streaming-results"

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const q = typeof params.q === "string" ? params.q : undefined
  const tastes = typeof params.tastes === "string" ? params.tastes : undefined
  const lat = typeof params.lat === "string" ? params.lat : undefined
  const long = typeof params.long === "string" ? params.long : undefined
  const sort = typeof params.sort === "string" ? params.sort : "distance"

  // Server-side location lookup when coordinates are available
  let locationDisplayName = ""
  let neighborhood: string | undefined
  let city: string | undefined

  if (lat && long) {
    const locationInfo = getLocationInfo(parseFloat(lat), parseFloat(long))
    neighborhood = locationInfo.neighborhood
    city = locationInfo.city

    if (locationInfo.neighborhood && locationInfo.city) {
      locationDisplayName = `in ${locationInfo.neighborhood}, ${locationInfo.city}`
    } else if (locationInfo.city) {
      locationDisplayName = `in ${locationInfo.city}`
    } else if (locationInfo.displayName) {
      locationDisplayName = `in ${locationInfo.displayName}`
    }
  }

  // Show welcome message if no search parameters
  if (!q && !tastes) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <Search className="h-16 w-16 text-brand-primary mb-6" />
        <h2 className="text-2xl font-semibold text-brand-text mb-4">Ready to discover amazing dishes?</h2>
        <p className="text-brand-text-muted mb-6 max-w-md">
          Search for specific dishes like "pasta" or "tacos" to find the best places near you.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            <p className="ml-3 text-gray-600">Loading search results...</p>
          </div>
        }
      >
        <StreamingResults 
          searchParams={{ q, tastes, lat, long, sort }}
          locationDisplayName={locationDisplayName}
          neighborhood={neighborhood}
          city={city}
        />
      </Suspense>
    </div>
  )
}
