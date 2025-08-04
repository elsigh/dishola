"use client"

import { Loader as GoogleMapsLoader } from "@googlemaps/js-api-loader"
import { Loader2, Map as MapIcon, SearchIcon, X, Edit3 } from "lucide-react"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { API_BASE_URL } from "@/lib/constants"
import { getLocationInfo } from "@/lib/location-utils"

function BluePulseDot() {
  return (
    <span className="relative flex h-5 w-5 items-center justify-center">
      {/* Halo pulse */}
      <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60 animate-blue-dot-pulse"></span>
      {/* Solid blue dot */}
      <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-600 border-2 border-white shadow"></span>
    </span>
  )
}

function formatLatLng(lat: number, lng: number) {
  return `Lat: ${lat.toFixed(2)}, Lng: ${lng.toFixed(2)}`
}

interface SearchSectionProps {
  includeTastesOption?: boolean
  isUserLoggedIn?: boolean
  neighborhood?: string
  initialQuery?: string
  initialLat?: number
  initialLng?: number
}

export default function SearchSection({
  isUserLoggedIn = false,
  neighborhood,
  initialQuery = "",
  initialLat,
  initialLng
}: SearchSectionProps) {
  const [dishQuery, setDishQuery] = useState(initialQuery)
  const [latitude, setLatitude] = useState<number | null>(initialLat || null)
  const [longitude, setLongitude] = useState<number | null>(initialLng || null)
  const [isLocating, setIsLocating] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mapOpen, setMapOpen] = useState(false)
  const [tempLat, setTempLat] = useState<number | null>(initialLat || null)
  const [tempLng, setTempLng] = useState<number | null>(initialLng || null)
  const [locationInfo, setLocationInfo] = useState<{
    neighborhood?: string
    city?: string
    displayName?: string
  } | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [addressInput, setAddressInput] = useState("")
  const mapRef = useRef<HTMLDivElement>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  // Update dishQuery when initialQuery changes (e.g., when navigating to search page)
  useEffect(() => {
    setDishQuery(initialQuery)
  }, [initialQuery])

  // Update coordinates when initialLat/initialLng change
  useEffect(() => {
    if (initialLat && initialLng) {
      setLatitude(initialLat)
      setLongitude(initialLng)
      setTempLat(initialLat)
      setTempLng(initialLng)
    }
  }, [initialLat, initialLng])

  // Function to fetch location information from coordinates (using client-side lookup)
  const fetchLocationInfo = useCallback((lat: number, lng: number) => {
    setIsLoadingLocation(true)
    try {
      const locationData = getLocationInfo(lat, lng)
      setLocationInfo({
        neighborhood: locationData.neighborhood,
        city: locationData.city,
        displayName: locationData.displayName
      })
    } catch (error) {
      console.error("Error fetching location info:", error)
      setLocationInfo(null)
    } finally {
      setIsLoadingLocation(false)
    }
  }, [])

  // Function to setup Google Places Autocomplete
  const setupAutocomplete = useCallback(async () => {
    if (!addressInputRef.current) return

    try {
      const loader = new GoogleMapsLoader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
        version: "weekly",
        libraries: ["places"]
      })
      
      await loader.load()
      
      autocompleteRef.current = new google.maps.places.Autocomplete(addressInputRef.current, {
        types: ["address"],
        componentRestrictions: { country: "us" }
      })

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace()
        if (place?.geometry?.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          
          // Update map location
          setTempLat(lat)
          setTempLng(lng)
          fetchLocationInfo(lat, lng)
          
          // Exit edit mode
          setIsEditingAddress(false)
          setAddressInput("")
        }
      })
    } catch (error) {
      console.error("Error setting up Google Places Autocomplete:", error)
    }
  }, [fetchLocationInfo])

  // Function to handle edit address click
  const handleEditAddress = useCallback(() => {
    setIsEditingAddress(true)
    setAddressInput("")
    // Focus the input after state update
    setTimeout(() => {
      addressInputRef.current?.focus()
    }, 0)
  }, [])

  // Function to cancel address editing
  const handleCancelEdit = useCallback(() => {
    setIsEditingAddress(false)
    setAddressInput("")
  }, [])

  // Function to handle location changes and trigger new search
  const handleLocationChange = useCallback(
    (newLat: number, newLng: number) => {
      setLatitude(newLat)
      setLongitude(newLng)
      setTempLat(newLat)
      setTempLng(newLng)

      // Always trigger a search with the new location (from any page)
      const params = new URLSearchParams()
      params.append("lat", newLat.toString())
      params.append("long", newLng.toString())

      // Preserve the current search query if it exists
      if (dishQuery.trim()) {
        params.append("q", dishQuery)
        // Don't add tastes parameter when we have a query
      } else if (isUserLoggedIn) {
        params.append("tastes", "true")
      }

      // Preserve sort parameter from current URL
      const currentSort = searchParams.get("sort")
      if (currentSort) {
        params.append("sort", currentSort)
      } else {
        // Default to distance if no sort parameter exists
        params.append("sort", "distance")
      }

      // Navigate to search page with new location parameters
      router.push(`/search?${params.toString()}`)
    },
    [dishQuery, isUserLoggedIn, router, searchParams]
  )

  // Google Maps modal logic
  useEffect(() => {
    if (mapOpen && mapRef.current && tempLat !== null && tempLng !== null) {
      const loader = new GoogleMapsLoader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        version: "weekly"
      })

      let map: google.maps.Map
      let accuracyCircle: google.maps.Circle

      loader.load().then(() => {
        map = new google.maps.Map(mapRef.current!, {
          center: { lat: tempLat, lng: tempLng },
          zoom: 13,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false
        })

        accuracyCircle = new google.maps.Circle({
          strokeColor: "#4285F4",
          strokeOpacity: 0.4,
          strokeWeight: 1,
          fillColor: "#4285F4",
          fillOpacity: 0.25,
          map,
          center: { lat: tempLat, lng: tempLng },
          radius: 50
        })

        // Update latitude and longitude based on map center when drag ends
        map.addListener("dragend", () => {
          const center = map.getCenter()
          if (center) {
            const lat = center.lat()
            const lng = center.lng()
            setTempLat(lat)
            setTempLng(lng)
            accuracyCircle.setCenter(center)
            // Fetch location info for the new coordinates
            fetchLocationInfo(lat, lng)
          }
        })

        // Fetch initial location info when map loads
        if (tempLat && tempLng) {
          fetchLocationInfo(tempLat, tempLng)
        }
      })

      return () => {
        // Cleanup
        if (accuracyCircle) {
          accuracyCircle.setMap(null)
        }
      }
    }
  }, [mapOpen, tempLat, tempLng, pathname, fetchLocationInfo])

  // Only request geolocation on mount if we don't have initial coordinates
  useEffect(() => {
    // Only request geolocation if we don't have initial coordinates and we don't already have coordinates
    if ((!initialLat || !initialLng) && (latitude === null || longitude === null)) {
      if (navigator.geolocation) {
        setIsLocating(true)
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude: lat, longitude: lng, accuracy } = position.coords
            console.debug(`[Geolocation:onLoad] lat: ${lat}, lng: ${lng}, accuracy: ${accuracy}`)
            setLatitude(lat)
            setLongitude(lng)
            setIsLocating(false)
          },
          (error) => {
            console.error("Geolocation error (onLoad):", error)
            setIsLocating(false)
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        )
      }
    }
  }, []) // Only run on mount, not on pathname changes

  // Setup autocomplete when entering edit mode
  useEffect(() => {
    if (isEditingAddress && addressInputRef.current) {
      setupAutocomplete()
    }
  }, [isEditingAddress, setupAutocomplete])

  // Reset edit state when modal closes
  useEffect(() => {
    if (!mapOpen) {
      setIsEditingAddress(false)
      setAddressInput("")
    }
  }, [mapOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (latitude === null || longitude === null) {
      alert("Please set your location to search.")
      return
    }

    const params = new URLSearchParams()
    params.append("lat", latitude.toString())
    params.append("long", longitude.toString())

    // If user is logged in and search box is empty, use taste-based search
    if (isUserLoggedIn && dishQuery.trim() === "") {
      params.append("tastes", "true")
    }
    // Otherwise, require a query term
    else if (!dishQuery.trim()) {
      alert("Please enter a dish to search.")
      return
    } else {
      // Add query param when search box has content
      params.append("q", dishQuery)
      // Don't add tastes parameter when we have a query
    }

    // Preserve sort parameter from current URL
    const currentSort = searchParams.get("sort")
    if (currentSort) {
      params.append("sort", currentSort)
    } else {
      // Default to distance if no sort parameter exists
      params.append("sort", "distance")
    }

    // If we're already on the search page, update the current URL
    if (pathname === "/search") {
      router.push(`/search?${params.toString()}`)
    } else {
      // Navigate to search page from other pages
      router.push(`/search?${params.toString()}`)
    }
  }

  const canSearch = (isUserLoggedIn || dishQuery.trim() !== "") && latitude !== null && longitude !== null

  return (
    <form onSubmit={handleSearch} className="w-full max-w-[850px]">
      <div className="relative w-full">
        <div className="relative flex items-center w-full px-4 bg-white rounded-full shadow-md border focus-within:shadow-lg transition-all duration-200">
          <div className="flex-shrink-0 mr-3 bg-brand-bg rounded-full p-1">
            <Image src="/img/dishola_logo_32x32.png" alt="Dishola" width={24} height={24} className="w-6 h-6" />
          </div>

          {/* Input field */}
          <input
            type="text"
            value={dishQuery}
            onChange={(e) => setDishQuery(e.target.value)}
            placeholder="What are you craving?"
            className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-lg py-3"
          />

          {/* Clear button */}
          {dishQuery && (
            <button
              type="button"
              onClick={() => setDishQuery("")}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Separator line */}
          {(dishQuery || true) && <div className="flex-shrink-0 w-px h-10 bg-gray-300 mx-1" />}

          {/* Map button */}
          <button
            type="button"
            onClick={() => {
              if (mapOpen) {
                setMapOpen(false)
              } else {
                setTempLat(latitude || 37.7749)
                setTempLng(longitude || -122.4194)
                setMapOpen(true)
              }
            }}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            disabled={isLocating}
            aria-label="Set location"
          >
            {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapIcon className="w-5 h-5" />}
          </button>

          {/* Search icon */}
          <button
            type="submit"
            className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            disabled={!canSearch || isLocating}
            aria-label="Search"
          >
            <SearchIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Map and location controls */}
      {mapOpen && (
        <div className="mt-4">
          <div className="relative">
            <div ref={mapRef} style={{ width: "100%", height: "400px" }} />
            {/* Absolutely positioned blue dot in the center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
              <BluePulseDot />
            </div>
          </div>
          {/* Location info and confirm button */}
          <div className="mt-3 bg-gray-50 rounded-lg p-3">
            {isEditingAddress ? (
              <div className="flex items-center gap-2 mb-3">
                <Input
                  ref={addressInputRef}
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Enter an address..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleCancelEdit}
                  size="sm"
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="text-sm text-gray-600 mb-3">
                {isLoadingLocation ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading location...</span>
                  </div>
                ) : locationInfo?.displayName || locationInfo?.neighborhood || locationInfo?.city ? (
                  <div>
                    <span>
                      {locationInfo.neighborhood && locationInfo.city
                        ? `${locationInfo.neighborhood}, ${locationInfo.city}`
                        : locationInfo.displayName || locationInfo.city || locationInfo.neighborhood}
                    </span>
                    {tempLat !== null && tempLng !== null && (
                      <span className="text-gray-400 ml-2">
                        ({formatLatLng(tempLat, tempLng)})
                        <button
                          type="button"
                          onClick={handleEditAddress}
                          className="ml-2 text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                          aria-label="Edit address"
                        >
                          <Edit3 className="w-3 h-3" />
                          edit
                        </button>
                      </span>
                    )}
                  </div>
                ) : tempLat !== null && tempLng !== null ? (
                  <div>
                    {formatLatLng(tempLat, tempLng)}
                    <button
                      type="button"
                      onClick={handleEditAddress}
                      className="ml-2 text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                      aria-label="Edit address"
                    >
                      <Edit3 className="w-3 h-3" />
                      edit
                    </button>
                  </div>
                ) : null}
              </div>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => {
                  if (tempLat !== null && tempLng !== null) {
                    handleLocationChange(tempLat, tempLng)
                    setMapOpen(false)
                  }
                }}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Confirm Location
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
