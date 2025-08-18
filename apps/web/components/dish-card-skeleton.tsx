export default function DishCardSkeleton() {
  return (
    <div className="bg-white border border-brand-border rounded overflow-hidden shadow-sm animate-pulse flex flex-col sm:flex-row">
      {/* Image skeleton */}
      <div className="sm:w-1/3 h-48 sm:h-auto bg-gray-200" style={{ aspectRatio: "4 / 3" }} />

      {/* Content skeleton */}
      <div className="p-4 sm:p-6 flex-1 space-y-3">
        {/* Title */}
        <div className="h-6 bg-gray-200 rounded w-3/4"></div>

        {/* Description */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>

        {/* Restaurant info */}
        <div className="space-y-2 pt-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>

        {/* Rating */}
        <div className="flex items-center space-x-1 pt-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-5 h-5 bg-gray-200 rounded"></div>
          ))}
          <div className="h-4 bg-gray-200 rounded w-8 ml-2"></div>
        </div>
      </div>
    </div>
  )
}
