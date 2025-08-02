import { Suspense } from "react"
import { getLocationInfo } from "@/lib/location-utils"
import SearchResultsContent from "./search-results-content"

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const lat = typeof params.lat === "string" ? params.lat : undefined
  const long = typeof params.long === "string" ? params.long : undefined

  // Server-side location lookup when coordinates are available
  let locationDisplayName = ""
  if (lat && long) {
    const locationInfo = getLocationInfo(parseFloat(lat), parseFloat(long))
    if (locationInfo.neighborhood && locationInfo.city) {
      locationDisplayName = `in ${locationInfo.neighborhood}, ${locationInfo.city}`
    } else if (locationInfo.city) {
      locationDisplayName = `in ${locationInfo.city}`
    } else if (locationInfo.displayName) {
      locationDisplayName = `in ${locationInfo.displayName}`
    }
  }

  return (
    <div className="flex flex-col">
      <Suspense fallback={<div>Loading...</div>}>
        <SearchResultsContent locationDisplayName={locationDisplayName} />
      </Suspense>
    </div>
  )
}
