"use client"

import { Autocomplete, useLoadScript } from "@react-google-maps/api"
import { CheckCircle, Clock, Globe, Loader2, MapPin, Phone } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  data: any
  setData: (d: any) => void
}

export default function StepRestaurant({ data, setData }: Props) {
  const [name, setName] = useState(data.restaurantName || "")
  const [address, setAddress] = useState(data.restaurantAddress || "")
  const [placeId, setPlaceId] = useState(data.placeId || "")
  const [placeDetails, setPlaceDetails] = useState<any>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    libraries: ["places"]
  })

  useEffect(() => {
    setData({
      ...data,
      restaurantName: name,
      restaurantAddress: address,
      placeId,
      placeDetails
    })
  }, [name, address, placeId, placeDetails])

  const fetchPlaceDetails = async (placeId: string) => {
    if (!window.google?.maps?.places) return

    setIsLoadingDetails(true)
    const service = new window.google.maps.places.PlacesService(document.createElement("div"))

    service.getDetails(
      {
        placeId,
        fields: [
          "name",
          "formatted_address",
          "formatted_phone_number",
          "website",
          "opening_hours",
          "rating",
          "price_level",
          "photos",
          "types"
        ]
      },
      (place, status) => {
        setIsLoadingDetails(false)
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          setPlaceDetails(place)
        }
      }
    )
  }

  const handlePlaceChanged = () => {
    if (!inputRef.current) return

    const autocomplete = (inputRef.current as any).autocomplete
    const place = autocomplete?.getPlace()

    if (!place) return

    const selectedName = place.name || inputRef.current.value
    const selectedAddress = place.formatted_address || ""
    const selectedPlaceId = place.place_id || ""

    setName(selectedName)
    setAddress(selectedAddress)
    setPlaceId(selectedPlaceId)

    if (selectedPlaceId) {
      fetchPlaceDetails(selectedPlaceId)
    }
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-sm text-red-700">Failed to load Google Places. Please refresh and try again.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Restaurant Search */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-brand-text">Restaurant Name *</Label>
        {!isLoaded ? (
          <div className="flex items-center space-x-2 p-3 border rounded-lg">
            <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
            <span className="text-sm text-brand-text-muted">Loading Google Places...</span>
          </div>
        ) : (
          <Autocomplete
            onLoad={(autocomplete) => {
              ;(inputRef.current as any).autocomplete = autocomplete
              if (name) {
                inputRef.current!.value = name
              }
            }}
            onPlaceChanged={handlePlaceChanged}
            options={{
              types: ["restaurant", "food", "meal_takeaway", "cafe"],
              fields: ["name", "formatted_address", "place_id", "geometry"]
            }}
          >
            <Input ref={inputRef} placeholder="Start typing restaurant name..." className="input-custom text-lg" />
          </Autocomplete>
        )}

        {name && placeId && (
          <Badge variant="outline" className="text-green-600 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Restaurant found!
          </Badge>
        )}
      </div>

      {/* Selected Restaurant Details */}
      {name && address && (
        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-brand-text">{name}</h3>
                  <p className="text-sm text-brand-text-muted mt-1">{address}</p>
                </div>
                {isLoadingDetails && <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />}
              </div>

              {/* Additional Place Details */}
              {placeDetails && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-green-200">
                  {placeDetails.formatted_phone_number && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Phone className="w-4 h-4 text-brand-text-muted" />
                      <span className="text-brand-text-muted">{placeDetails.formatted_phone_number}</span>
                    </div>
                  )}

                  {placeDetails.website && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Globe className="w-4 h-4 text-brand-text-muted" />
                      <a
                        href={placeDetails.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate"
                      >
                        Website
                      </a>
                    </div>
                  )}

                  {placeDetails.opening_hours?.isOpen && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-medium">Open now</span>
                    </div>
                  )}

                  {placeDetails.rating && (
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-brand-text-muted">⭐ {placeDetails.rating}/5</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Entry Option */}
      {!name && isLoaded && (
        <div className="text-center">
          <p className="text-sm text-brand-text-muted mb-3">Can't find your restaurant? You can enter it manually.</p>
          <div className="space-y-3">
            <Input
              placeholder="Restaurant name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setPlaceId("") // Clear place ID for manual entry
                setPlaceDetails(null)
              }}
              className="input-custom"
            />
            <Input
              placeholder="Restaurant address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="input-custom"
            />
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">🏪 Restaurant Tips</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Search by restaurant name for the most accurate results</li>
          <li>• Make sure the address matches where you actually ate</li>
          <li>• If you can't find it, try searching for nearby landmarks</li>
        </ul>
      </div>
    </div>
  )
}
