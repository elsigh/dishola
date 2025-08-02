"use client"

import { Loader as GoogleMapsLoader } from "@googlemaps/js-api-loader"
import { Loader2, Map as MapIcon, SearchIcon, X } from "lucide-react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { API_BASE_URL } from "@/lib/constants"

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
  const [mapOpen, setMapOpen] = useState(false)
  const [tempLat, setTempLat] = useState<number | null>(initialLat || null)
  const [tempLng, setTempLng] = useState<number | null>(initialLng || null)
  const [locationInfo, setLocationInfo] = useState<{
    neighborhood?: string
    city?: string
    displayName?: string
  } | null>(null)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)

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

  // Function to fetch location information from coordinates
  const fetchLocationInfo = useCallback(async (lat: number, lng: number) => {
    setIsLoadingLocation(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/geocode?lat=${lat}&lng=${lng}`)
      if (response.ok) {
        const data = await response.json()
        setLocationInfo(data)
      } else {
        console.error("Failed to fetch location info")
        setLocationInfo(null)
      }
    } catch (error) {
      console.error("Error fetching location info:", error)
      setLocationInfo(null)
    } finally {
      setIsLoadingLocation(false)
    }
  }, [])

  // Function to handle location changes and trigger new search
  const handleLocationChange = useCallback(
    (newLat: number, newLng: number) => {
      setLatitude(newLat)
      setLongitude(newLng)
      setTempLat(newLat)
      setTempLng(newLng)

      // Always trigger a search with the new location (from any page)
      const searchParams = new URLSearchParams()
      searchParams.append("lat", newLat.toString())
      searchParams.append("long", newLng.toString())

      // Preserve the current search query if it exists
      if (dishQuery.trim()) {
        searchParams.append("q", dishQuery)
        searchParams.append("tastes", "false")
      } else if (isUserLoggedIn) {
        searchParams.append("tastes", "true")
      }

      // Navigate to search page with new location parameters
      router.push(`/search?${searchParams.toString()}`)
    },
    [dishQuery, isUserLoggedIn, router]
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (latitude === null || longitude === null) {
      alert("Please set your location to search.")
      return
    }

    const searchParams = new URLSearchParams()
    searchParams.append("lat", latitude.toString())
    searchParams.append("long", longitude.toString())

    // If user is logged in and search box is empty, use taste-based search
    if (isUserLoggedIn && dishQuery.trim() === "") {
      searchParams.append("tastes", "true")
    }
    // Otherwise, require a query term
    else if (!dishQuery.trim()) {
      alert("Please enter a dish to search.")
      return
    } else {
      // Add query param when search box has content
      searchParams.append("q", dishQuery)

      // Don't include tastes when explicitly searching for something
      searchParams.append("tastes", "false")
    }

    // If we're already on the search page, update the current URL
    if (pathname === "/search") {
      router.push(`/search?${searchParams.toString()}`)
    } else {
      // Navigate to search page from other pages
      router.push(`/search?${searchParams.toString()}`)
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
            placeholder={
              isUserLoggedIn && dishQuery.trim() === ""
                ? "Search based on your Tastes..."
                : "e.g., Spicy Ramen, Tacos al Pastor, Best Burger"
            }
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
          <div className="mt-3 flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">
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
                    </span>
                  )}
                </div>
              ) : tempLat !== null && tempLng !== null ? (
                formatLatLng(tempLat, tempLng)
              ) : null}
            </div>
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
      )}
    </form>
  )
}
