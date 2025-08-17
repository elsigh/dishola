import Link from "next/link"
import type { FC } from "react"
import LocationDot from "@/components/ui/location-dot"

interface ResultsForProps {
  neighborhood: string | undefined
  city: string | undefined
  showTastesLink?: boolean
  isSearching?: boolean
  searchQuery?: string
  searchType?: string
  aiProgress?: { message: string; timing?: any } | null
  timeToFirstDish?: number | null
}

const ResultsFor: FC<ResultsForProps> = ({ 
  neighborhood, 
  city, 
  showTastesLink = false, 
  isSearching = false,
  searchQuery,
  searchType,
  aiProgress,
  timeToFirstDish
}) => {
  // Show loading state or completed results
  const displayText = isSearching 
    ? `Searching for ${searchQuery ? `${searchQuery} deliciousness` : "deliciousness"} near ${neighborhood && city ? `${neighborhood}, ${city}` : neighborhood || city || "your location"}...`
    : `Results for ${neighborhood}${city ? `, ${city}` : ""}`

  return (
    <div>
      <div className="flex gap-2 items-center">
        <h2 className="text-brand-primary">
          <LocationDot /> <strong>{displayText}</strong>
        </h2>
        {!isSearching && showTastesLink && (
          <>
            <span>∙</span>
            <Link href="/profile" className="text-sm text-brand-text-muted hover:text-brand-primary">
              Manage my Tastes
            </Link>
          </>
        )}
      </div>
      
      {/* AI Progress Info - small text underneath */}
      {aiProgress && (
        <div className="text-xs text-brand-text-muted/75 mt-1">
          {aiProgress.timing?.totalTime
            ? `Search completed in ${aiProgress.timing.totalTime}ms (${aiProgress.timing.avgTokensPerSecond} tokens/sec)${timeToFirstDish ? `, TTFD: ${(timeToFirstDish / 1000).toFixed(1)}s` : ''}`
            : aiProgress.timing?.timeToFirstToken
              ? `First response: ${aiProgress.timing.timeToFirstToken}ms${timeToFirstDish ? `, TTFD: ${(timeToFirstDish / 1000).toFixed(1)}s` : ''}`
              : aiProgress.message}
        </div>
      )}
    </div>
  )
}

export default ResultsFor
