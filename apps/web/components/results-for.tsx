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
  console.log("🍽️ ResultsFor props:", { timeToFirstDish, aiProgress })

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

      {/* AI Progress Info - small text underneath with monospace font for metrics */}
      <div
        className={`text-xs text-brand-text-muted/75 mt-1 font-mono ${!aiProgress ? "invisible" : "visible"}`}
        title={timeToFirstDish ? "TTFD = Time To First Dish" : undefined}
      >
        {aiProgress
          ? aiProgress.timing?.totalTime
            ? `Done in ${aiProgress.timing.totalTime >= 1000 ? `${(aiProgress.timing.totalTime / 1000).toFixed(1)}s` : `${aiProgress.timing.totalTime}ms`}${timeToFirstDish ? `, TTFD: ${timeToFirstDish >= 1000 ? `${(timeToFirstDish / 1000).toFixed(1)}s` : `${timeToFirstDish}ms`}` : ""}${aiProgress.timing.avgTokensPerSecond ? ` (${aiProgress.timing.avgTokensPerSecond} tok/sec)` : ""}`
            : aiProgress.timing?.timeToFirstToken
              ? `First response: ${aiProgress.timing.timeToFirstToken}ms${timeToFirstDish ? `, TTFD: ${timeToFirstDish >= 1000 ? `${(timeToFirstDish / 1000).toFixed(1)}s` : `${timeToFirstDish}ms`}` : ""}`
              : `${aiProgress.message}${timeToFirstDish ? `, TTFD: ${timeToFirstDish >= 1000 ? `${(timeToFirstDish / 1000).toFixed(1)}s` : `${timeToFirstDish}ms`}` : ""}`
          : // Placeholder text to maintain layout height
            "\u00A0"}
      </div>
    </div>
  )
}

export default ResultsFor
