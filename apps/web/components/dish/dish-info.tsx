"use client"

import { Calendar, ChefHat, Clock, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface DishInfoProps {
  dish: {
    id: string
    name: string
    description: string
    cuisine: string
    category: string
    price: number
    rating: number
    reviewCount: number
    createdAt: string
    updatedAt: string
  }
}

const PRICE_RANGES = {
  1: { label: "$ - Under $15", description: "Budget-friendly" },
  2: { label: "$$ - $15-30", description: "Moderate" },
  3: { label: "$$$ - $30-60", description: "Upscale" },
  4: { label: "$$$$ - $60+", description: "Fine dining" }
}

export default function DishInfo({ dish }: DishInfoProps) {
  const priceRange = PRICE_RANGES[dish.price as keyof typeof PRICE_RANGES]
  const createdDate = new Date(dish.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })

  return (
    <div className="space-y-6">
      {/* Main Info Card */}
      <Card className="border-2 border-brand-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-brand-primary">
            <ChefHat className="w-5 h-5" />
            <span>Dish Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-brand-text mb-1">Cuisine Type</h4>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {dish.cuisine}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-medium text-brand-text mb-1">Category</h4>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  {dish.category}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-brand-text mb-1">Price Range</h4>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {priceRange.label}
                  </Badge>
                  <span className="text-xs text-brand-text-muted">{priceRange.description}</span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-brand-text mb-1">Added to dishola</h4>
                <div className="flex items-center space-x-2 text-sm text-brand-text-muted">
                  <Calendar className="w-4 h-4" />
                  <span>{createdDate}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card className="border-2 border-brand-border">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-brand-primary">
            <Users className="w-5 h-5" />
            <span>Community Stats</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-brand-bg/30 rounded-lg">
              <div className="text-2xl font-bold text-brand-primary">{dish.rating.toFixed(1)}</div>
              <div className="text-sm text-brand-text-muted">Average Rating</div>
              <div className="flex justify-center mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-3 h-3 ${
                      star <= Math.floor(dish.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                    }`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>

            <div className="text-center p-4 bg-brand-bg/30 rounded-lg">
              <div className="text-2xl font-bold text-brand-primary">{dish.reviewCount}</div>
              <div className="text-sm text-brand-text-muted">{dish.reviewCount === 1 ? "Review" : "Reviews"}</div>
            </div>

            <div className="text-center p-4 bg-brand-bg/30 rounded-lg col-span-2 md:col-span-1">
              <div className="text-2xl font-bold text-brand-primary">
                {Math.round((dish.reviewCount / (dish.reviewCount + 5)) * 100)}%
              </div>
              <div className="text-sm text-brand-text-muted">Would Recommend</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description Card */}
      <Card className="border-2 border-brand-border">
        <CardHeader>
          <CardTitle className="text-brand-primary">About This Dish</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-brand-text leading-relaxed">{dish.description}</p>
        </CardContent>
      </Card>
    </div>
  )
}
