"use client"

import { useRouter, useSearchParams } from "next/navigation"

interface SortSelectorProps {
  currentSort: string
}

export default function SortSelector({ currentSort }: SortSelectorProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSortChange = (newSort: string) => {
    if (newSort === currentSort) return // No change needed

    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", newSort)

    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm text-gray-600 font-medium">Sort by:</span>
      <div className="flex gap-1">
        <button
          onClick={() => handleSortChange("distance")}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            currentSort === "distance" ? "bg-brand-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Distance
        </button>
        <button
          onClick={() => handleSortChange("rating")}
          className={`px-3 py-1 text-sm rounded-full transition-colors ${
            currentSort === "rating" ? "bg-brand-primary text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Rating
        </button>
      </div>
    </div>
  )
}
