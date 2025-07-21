"use client"

import { ExternalLink, Globe, MapPin, Navigation, Phone, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface RestaurantInfoProps {
  restaurant: {
    id: string
    name: string
    address: string
    placeId?: string
    phone?: string
    website?: string
    rating?: number
    priceLevel?: number
  }
}

const PRICE_LEVELS = {
  1: "$",
  2: "$$",
  3: "$$$",
  4: "$$$$"
}

export default function RestaurantInfo({ restaurant }: RestaurantInfoProps) {
  const googleMapsUrl = restaurant.placeId
    ? `https://www.google.com/maps/place/?q=place_id:${restaurant.placeId}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(restaurant.address)}`

  const priceLevel = restaurant.priceLevel ? PRICE_LEVELS[restaurant.priceLevel as keyof typeof PRICE_LEVELS] : null

  return (
    <Card className="border-2 border-brand-border sticky top-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-brand-primary">
          <MapPin className="w-5 h-5" />
          <span>Restaurant</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Restaurant Name */}
        <div>
          <h3 className="text-lg font-semibold text-brand-text">{restaurant.name}</h3>
          {restaurant.rating && (
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= Math.floor(restaurant.rating!) ? "text-yellow-400 fill-current" : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-brand-text-muted">{restaurant.rating.toFixed(1)}</span>
              {priceLevel && (
                <Badge variant="outline" className="text-xs">
                  {priceLevel}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Address */}
        <div className="space-y-2">
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-brand-text-muted mt-0.5 flex-shrink-0" />
            <p className="text-sm text-brand-text-muted leading-relaxed">{restaurant.address}</p>
          </div>
        </div>

        {/* Contact Info */}
        {(restaurant.phone || restaurant.website) && (
          <div className="space-y-2">
            {restaurant.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-brand-text-muted" />
                <a href={`tel:${restaurant.phone}`} className="text-sm text-blue-600 hover:underline">
                  {restaurant.phone}
                </a>
              </div>
            )}

            {restaurant.website && (
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-brand-text-muted" />
                <a
                  href={restaurant.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center space-x-1"
                >
                  <span>Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-brand-border">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.open(googleMapsUrl, "_blank")}
          >
            <MapPin className="w-4 h-4 mr-2" />
            View on Google Maps
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.open(directionsUrl, "_blank")}
          >
            <Navigation className="w-4 h-4 mr-2" />
            Get Directions
          </Button>
        </div>

        {/* More Dishes Link */}
        <div className="pt-2 border-t border-brand-border">
          <Button variant="ghost" className="w-full text-brand-primary hover:bg-brand-primary/5">
            View all dishes from {restaurant.name}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
