import Image from "next/image"
import { Star } from "lucide-react"

interface Dish {
  id: string
  dishName: string
  restaurantName: string
  description: string
  imageUrl: string
  rating: number
  address: string
}

interface DishCardProps {
  dish: Dish
}

export default function DishCard({ dish }: DishCardProps) {
  return (
    <div className="bg-white border border-brand-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 ease-in-out flex flex-col sm:flex-row">
      <div className="sm:w-1/3 h-48 sm:h-auto relative">
        <Image
          src={dish.imageUrl || "/placeholder.svg"}
          alt={`Image of ${dish.dishName}`}
          layout="fill"
          objectFit="cover"
          className="bg-gray-100"
        />
      </div>
      <div className="p-4 sm:p-6 flex-1">
        <h3 className="text-xl font-semibold text-brand-primary mb-1">{dish.dishName}</h3>
        <p className="text-sm text-brand-text-muted mb-1">{dish.restaurantName}</p>
        <p className="text-sm text-brand-text-muted mb-3">{dish.address}</p>

        {dish.rating && (
          <div className="flex items-center mb-3">
            {[...Array(Math.floor(dish.rating))].map((_, i) => (
              <Star key={`full-${i}`} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
            ))}
            {dish.rating % 1 !== 0 && (
              <Star key="half" className="h-5 w-5 text-yellow-400" style={{ clipPath: "inset(0 50% 0 0)" }} />
            )}
            {[...Array(5 - Math.ceil(dish.rating))].map((_, i) => (
              <Star key={`empty-${i}`} className="h-5 w-5 text-gray-300" />
            ))}
            <span className="ml-2 text-sm text-brand-text-muted">{dish.rating.toFixed(1)}</span>
          </div>
        )}

        <p className="text-brand-text text-sm leading-relaxed">{dish.description}</p>
      </div>
    </div>
  )
}
