"use client"

import DishCard from "@/components/dish-card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2, SearchSlash } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

interface Dish {
  id: string
  dishName: string
  restaurantName: string
  description: string
  imageUrl: string
  rating: number
  address: string
}

export default function SearchResults() {
  const searchParams = useSearchParams()
  const q = searchParams.get("q")
  const lat = searchParams.get("lat")
  const long = searchParams.get("long")

  const [dishes, setDishes] = useState<Dish[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (q && lat && long) {
      setIsLoading(true)
      setError(null)
      fetch(`/api/search?q=${encodeURIComponent(q)}&lat=${lat}&long=${long}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch search results. Please try again.")
          }
          return res.json()
        })
        .then((data) => {
          if (data.error) {
            throw new Error(data.error)
          }
          setDishes(data.dishes || [])
          setIsLoading(false)
        })
        .catch((err) => {
          console.error("Search API error:", err)
          setError(err.message || "An unknown error occurred.")
          setIsLoading(false)
        })
    } else {
      // Reset state when no search parameters
      setDishes([])
      setIsLoading(false)
      setError(null)
    }
  }, [q, lat, long])

  // Don't show anything if no search query
  if (!q) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-brand-primary mb-4" />
        <p className="text-brand-text-muted">Searching for deliciousness...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 bg-red-50 border border-red-200 p-8 rounded-lg">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-700 mb-2">Oops! Something went wrong.</h2>
        <p className="text-red-600 mb-6">{error}</p>
        <Button asChild className="btn-custom-primary">
          <Link href="/">Try a new search</Link>
        </Button>
      </div>
    )
  }

  if (dishes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <SearchSlash className="h-12 w-12 text-brand-text-muted mb-4" />
        <h2 className="text-xl font-semibold text-brand-text mb-2">No dishes found for &quot;{q}&quot;</h2>
        <p className="text-brand-text-muted mb-6">Try a different search term or broaden your cravings!</p>
        <Button asChild className="btn-custom-primary">
          <Link href="/">Try a new search</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-brand-text mb-2">Results for &quot;{q}&quot;</h2>
      <p className="text-brand-text-muted mb-8">
        Showing dishes found near your location (Lat: {Number.parseFloat(lat || "0").toFixed(2)}, Long:{" "}
        {Number.parseFloat(long || "0").toFixed(2)}).
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
        {dishes.map((dish) => (
          <DishCard key={dish.id} dish={dish} />
        ))}
      </div>
    </div>
  )
} 