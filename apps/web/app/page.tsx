import SearchResults from "@/components/search-results"
import SearchSection from "@/components/search-section"
import { Suspense } from "react"

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-brand-text mb-4">
          Find Your Perfect Dish
        </h1>
        <p className="text-lg text-brand-text-muted max-w-2xl mx-auto">
          Discover amazing dishes from restaurants near you. Search by dish name, cuisine type, or specific cravings.
        </p>
      </div>
      
      <div className="flex flex-col items-center">
        <SearchSection />
        
        <div className="w-full max-w-4xl mt-12">
          <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
            <SearchResults />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
