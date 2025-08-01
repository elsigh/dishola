"use client"

import { Loader as GoogleMapsLoader } from "@googlemaps/js-api-loader"
import { Loader2, Map as MapIcon, SearchIcon, X } from "lucide-react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
  const [locationStatus, setLocationStatus] = useState(
    initialLat && initialLng ? formatLatLng(initialLat, initialLng) : "Set your location to search"
  )
  const [isLocating, setIsLocating] = useState(false)
  const [isImproving, setIsImproving] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const [mapOpen, setMapOpen] = useState(false)
  const [tempLat, setTempLat] = useState<number | null>(initialLat || null)
  const [tempLng, setTempLng] = useState<number | null>(initialLng || null)
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
      setLocationStatus(formatLatLng(initialLat, initialLng))
      setTempLat(initialLat)
      setTempLng(initialLng)
    }
  }, [initialLat, initialLng])

  // Google Maps modal logic
  useEffect(() => {
    if (mapOpen && mapRef.current && tempLat !== null && tempLng !== null) {
      const loader = new GoogleMapsLoader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        version: "weekly"
      })
      let map: google.maps.Map
      let marker: google.maps.Marker
      let accuracyCircle: google.maps.Circle
      let locationButton: HTMLDivElement

      loader.load().then(() => {
        map = new google.maps.Map(mapRef.current!, {
          center: { lat: tempLat, lng: tempLng },
          zoom: 13,
          streetViewControl: false, // Remove street view button
          mapTypeControl: false, // Remove map type control for cleaner look
          fullscreenControl: false // Remove fullscreen control
        })

        marker = new google.maps.Marker({
          position: { lat: tempLat, lng: tempLng },
          map,
          draggable: true,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#4285F4",
            fillOpacity: 1,
            strokeColor: "#FFFFFF",
            strokeWeight: 2
          }
        })

        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            const lat = e.latLng.lat()
            const lng = e.latLng.lng()
            marker.setPosition({ lat, lng })
            setTempLat(lat)
            setTempLng(lng)
          }
        })

        // Add dragend listener to marker to update location when user drags it
        marker.addListener("dragend", () => {
          const position = marker.getPosition()
          if (position) {
            const lat = position.lat()
            const lng = position.lng()
            setTempLat(lat)
            setTempLng(lng)
          }
        })

        accuracyCircle = new google.maps.Circle({
          strokeColor: "#4285F4",
          strokeOpacity: 0.4,
          strokeWeight: 1,
          fillColor: "#4285F4",
          fillOpacity: 0.25,
          map,
          center: { lat: tempLat, lng: tempLng },
          radius: 50 // Default radius if accuracy is not available
        })

        // Update circle position and radius on marker drag
        marker.addListener("dragend", () => {
          const position = marker.getPosition()
          if (position) {
            accuracyCircle.setCenter(position)
          }
        })

        // Create custom location button
        locationButton = document.createElement("div")
        locationButton.style.cssText = `
          background-color: white;
          border: 1px solid #ccc;
          border-radius: 2px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          cursor: pointer;
          margin: 10px;
          text-align: center;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        `

        // Add tooltip
        locationButton.title = "Reset to current location"

        // Create the location icon (blue dot with crosshairs)
        const locationIcon = document.createElement("div")
        locationIcon.style.cssText = `
          width: 18px;
          height: 18px;
          background-color: #4285F4;
          border-radius: 50%;
          position: relative;
        `

        // Add crosshairs to the icon (more like Google Maps)
        const crosshair = document.createElement("div")
        crosshair.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 10px;
          height: 10px;
          border: 2px solid white;
          border-radius: 50%;
        `

        // Add the four lines extending from the crosshair
        const lines = document.createElement("div")
        lines.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 18px;
          height: 18px;
        `

        // Create the four lines
        for (let i = 0; i < 4; i++) {
          const line = document.createElement("div")
          line.style.cssText = `
            position: absolute;
            background-color: #4285F4;
            width: 2px;
            height: 4px;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(${i * 90}deg) translateY(-9px);
          `
          lines.appendChild(line)
        }

        locationIcon.appendChild(crosshair)
        locationIcon.appendChild(lines)
        locationButton.appendChild(locationIcon)

        // Add hover effect
        locationButton.addEventListener("mouseenter", () => {
          locationButton.style.backgroundColor = "#f8f9fa"
        })

        locationButton.addEventListener("mouseleave", () => {
          locationButton.style.backgroundColor = "white"
        })

        // Add click handler for location button
        locationButton.addEventListener("click", () => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const { latitude: lat, longitude: lng, accuracy } = position.coords
                console.debug(`[Geolocation:mapButton] lat: ${lat}, lng: ${lng}, accuracy: ${accuracy}`)

                // Update map and marker
                const newPosition = { lat, lng }
                map.setCenter(newPosition)
                marker.setPosition(newPosition)
                accuracyCircle.setCenter(newPosition)
                accuracyCircle.setRadius(accuracy || 50)

                // Update state
                setTempLat(lat)
                setTempLng(lng)

                // If we're on the search page, trigger a new search with the new location
                if (pathname === "/search") {
                  handleLocationChange(lat, lng)
                } else {
                  setLatitude(lat)
                  setLongitude(lng)
                  setLocationStatus(formatLatLng(lat, lng))
                }
              },
              (error) => {
                console.error("Geolocation error (map button):", error)
                alert("Could not get your current location. Please try again.")
              },
              { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
            )
          } else {
            alert("Geolocation is not supported by your browser.")
          }
        })

        // Position the button in the bottom right
        map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locationButton)
      })

      return () => {
        // Cleanup
        if (locationButton && locationButton.parentNode) {
          locationButton.parentNode.removeChild(locationButton)
        }
      }
    }
  }, [mapOpen, tempLat, tempLng])

  // Only request geolocation on mount if we don't have initial coordinates
  useEffect(() => {
    // Only request geolocation if we don't have initial coordinates and we don't already have coordinates
    if ((!initialLat || !initialLng) && (latitude === null || longitude === null)) {
      if (navigator.geolocation) {
        setIsLocating(true)
        setLocationStatus("Fetching location...")
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude: lat, longitude: lng, accuracy } = position.coords
            console.debug(`[Geolocation:onLoad] lat: ${lat}, lng: ${lng}, accuracy: ${accuracy}`)
            setLatitude(lat)
            setLongitude(lng)
            setLocationStatus(formatLatLng(lat, lng))
            setIsLocating(false)
          },
          (error) => {
            console.error("Geolocation error (onLoad):", error)
            setLocationStatus(`Error: ${error.message}. You offline?`)
            setIsLocating(false)
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        )
      }
    }
  }, []) // Only run on mount, not on pathname changes

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported by your browser.")
      return
    }

    setIsLocating(true)
    setIsImproving(false)
    setLocationStatus("Fetching location...")

    let bestAccuracy = Infinity
    let watchId: number | null = null
    let timeoutId: number | null = null
    const accuracyThreshold = 20

    const updatePosition = (position: GeolocationPosition) => {
      const { latitude: lat, longitude: lng, accuracy } = position.coords
      console.debug(`[Geolocation:updatePosition] lat: ${lat}, lng: ${lng}, accuracy: ${accuracy}`)
      setLatitude(lat)
      setLongitude(lng)
      setLocationStatus(formatLatLng(lat, lng))
      setIsLocating(false)
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updatePosition(position)
        bestAccuracy = position.coords.accuracy

        // If accuracy is not good, start watchPosition for up to 20s
        if (bestAccuracy > accuracyThreshold) {
          setIsImproving(true)
          watchId = navigator.geolocation.watchPosition(
            (pos) => {
              console.debug(
                `[Geolocation:watch] lat: ${pos.coords.latitude}, lng: ${pos.coords.longitude}, accuracy: ${pos.coords.accuracy}`
              )
              bestAccuracy = pos.coords.accuracy
              updatePosition(pos)
              if (bestAccuracy <= accuracyThreshold) {
                if (watchId !== null) navigator.geolocation.clearWatch(watchId)
                setIsImproving(false)
                if (timeoutId !== null) clearTimeout(timeoutId)
                console.debug("[Geolocation:watchPosition] stopped watching - good accuracy")
              }
            },
            (err) => {
              console.error("[Geolocation:watchPosition] error:", err)
            },
            { enableHighAccuracy: true }
          )
          timeoutId = window.setTimeout(() => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId)
            setIsImproving(false)
            console.debug("[Geolocation:watchPosition] stopped watching - timeout")
          }, 20000)
        }
      },
      (error) => {
        console.error("Geolocation error:", error)
        setLocationStatus(`Error: ${error.message}. You offline?`)
        setIsLocating(false)
        setIsImproving(false)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    )
  }

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
      searchParams.append("includeTastes", "true")
    }
    // Otherwise, require a query term
    else if (!dishQuery.trim()) {
      alert("Please enter a dish to search.")
      return
    } else {
      // Add query param when search box has content
      searchParams.append("q", dishQuery)

      // Don't include tastes when explicitly searching for something
      searchParams.append("includeTastes", "false")
    }

    // If we're already on the search page, update the current URL
    if (pathname === "/search") {
      router.push(`/search?${searchParams.toString()}`)
    } else {
      // Navigate to search page from other pages
      router.push(`/search?${searchParams.toString()}`)
    }
  }

  // Function to handle location changes and trigger new search
  const handleLocationChange = (newLat: number, newLng: number) => {
    setLatitude(newLat)
    setLongitude(newLng)
    setLocationStatus(formatLatLng(newLat, newLng))
    setTempLat(newLat)
    setTempLng(newLng)

    // If we're on the search page, trigger a new search with the new location
    if (pathname === "/search") {
      const searchParams = new URLSearchParams()
      searchParams.append("lat", newLat.toString())
      searchParams.append("long", newLng.toString())

      // Preserve the current search query if it exists
      if (dishQuery.trim()) {
        searchParams.append("q", dishQuery)
        searchParams.append("includeTastes", "false")
      } else if (isUserLoggedIn) {
        searchParams.append("includeTastes", "true")
      }

      router.push(`/search?${searchParams.toString()}`)
    }
  }

  const canSearch = (isUserLoggedIn || dishQuery.trim() !== "") && latitude !== null && longitude !== null

  return (
    <form onSubmit={handleSearch} className="w-full">
      <div className="relative w-full">
        <div className="relative flex items-center w-full px-4 bg-white rounded-full shadow-sm border border-gray-200 hover:shadow-md focus-within:shadow-lg focus-within:border-brand-primary transition-all duration-200">
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
          <div ref={mapRef} style={{ width: "100%", height: "400px" }} />
          <div className="flex justify-between items-center mt-4">
            <Button
              type="button"
              onClick={() => {
                if (tempLat !== null && tempLng !== null) {
                  handleLocationChange(tempLat, tempLng)
                  setMapOpen(false)
                }
              }}
              className="btn-custom-primary"
              disabled={tempLat === null || tempLng === null}
            >
              Set Location & Search
            </Button>
            <Button type="button" onClick={() => setMapOpen(false)} variant="outline" className="btn-custom-secondary">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
