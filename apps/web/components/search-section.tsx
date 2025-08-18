"use client"

import { Loader as GoogleMapsLoader } from "@googlemaps/js-api-loader"
import { Crosshair, Edit3, Loader2, Map as MapIcon, SearchIcon, X } from "lucide-react"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
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
  const [autocompleteReady, setAutocompleteReady] = useState(false)
  const [showLocationTooltip, setShowLocationTooltip] = useState(false)
  const [tooltipDismissed, setTooltipDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('locationTooltipDismissed') === 'true'
    }
    return false
  })
  const [isTrackingLocation, setIsTrackingLocation] = useState(false)
  const [isGpsPulsing, setIsGpsPulsing] = useState(false)
  const [useFullScreenHeight, setUseFullScreenHeight] = useState(false)
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const gpsPulseTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const searchFormRef = useRef<HTMLFormElement>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

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

  // Create a div container for the autocomplete element
  const autocompleteContainerRef = useRef<HTMLDivElement>(null)


  // Function to setup Google Places Autocomplete (using new PlaceAutocompleteElement)
  const setupAutocomplete = useCallback(async () => {
    if (!autocompleteContainerRef.current || autocompleteRef.current) return

    try {
      const loader = new GoogleMapsLoader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        version: "weekly",
        libraries: ["places"]
      })

      await loader.load()

      // Create the new PlaceAutocompleteElement
      const autocompleteElement = new google.maps.places.PlaceAutocompleteElement({
        types: ["address"],
        componentRestrictions: { country: "us" }
      })

      // Store reference to autocomplete element
      autocompleteRef.current = autocompleteElement

      // Add the element to our container div instead of replacing
      autocompleteContainerRef.current.appendChild(autocompleteElement)

      // Add styles to match our Input component
      autocompleteElement.style.width = "100%"
      autocompleteElement.style.padding = "6px 8px"
      autocompleteElement.style.border = "1px solid #d1d5db"
      autocompleteElement.style.borderRadius = "6px"
      autocompleteElement.style.fontSize = "14px"
      autocompleteElement.style.textAlign = "left"
      autocompleteElement.setAttribute("placeholder", "Enter an address...")

      // Auto-focus the input
      setTimeout(() => {
        autocompleteElement.focus()
      }, 100)

      // Add CSS to left-align dropdown results (only add once)
      if (!document.querySelector("#places-autocomplete-styles")) {
        const style = document.createElement("style")
        style.id = "places-autocomplete-styles"
        style.textContent = `
          .gm-style .pac-container {
            text-align: left !important;
          }
          .gm-style .pac-item {
            text-align: left !important;
            padding: 8px 16px !important;
          }
          .gm-style .pac-item-query {
            text-align: left !important;
          }
          .gm-style .pac-matched {
            font-weight: 600 !important;
          }
        `
        document.head.appendChild(style)
      }

      // Use the correct event for PlaceAutocompleteElement
      autocompleteElement.addEventListener("gmp-select", async ({ placePrediction }: any) => {
        console.debug("[Places] gmp-select event fired with placePrediction:", placePrediction)

        try {
          const place = placePrediction.toPlace()
          console.debug("[Places] Place from placePrediction:", place)

          // Fetch the required fields
          await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] })
          console.debug("[Places] Place after fetchFields:", place.toJSON())

          const placeData = place.toJSON()

          if (placeData.location) {
            // The location object has lat and lng properties, not methods
            const lat = placeData.location.lat
            const lng = placeData.location.lng
            console.debug(`[Places] Extracted coordinates: ${lat}, ${lng}`)

            // Update map location
            setTempLat(lat)
            setTempLng(lng)

            // Update main location state
            setLatitude(lat)
            setLongitude(lng)

            // Update URL parameters with chosen location
            const currentParams = new URLSearchParams(searchParams.toString())
            currentParams.set("lat", lat.toString())
            currentParams.set("long", lng.toString())
            router.replace(`${pathname}?${currentParams.toString()}`, { scroll: false })

            // Update map center and accuracy circle if map is loaded
            if (mapInstanceRef.current) {
              const newCenter = { lat, lng }
              console.debug(`[Places] Centering map on:`, newCenter)
              mapInstanceRef.current.setCenter(newCenter)

              if (accuracyCircleRef.current) {
                accuracyCircleRef.current.setCenter(newCenter)
                accuracyCircleRef.current.setRadius(50)
                console.debug("[Places] Updated accuracy circle")
              }
              console.debug(`[Places] Map centered successfully`)
            } else {
              console.debug(`[Places] Map not loaded, coordinates set for when map opens: ${lat}, ${lng}`)
            }

            fetchLocationInfo(lat, lng)

            // Exit edit mode
            setIsEditingAddress(false)
          } else {
            console.debug("[Places] No location found in place data:", placeData)
          }
        } catch (error) {
          console.error("[Places] Error processing place selection:", error)
        }
      })

      setAutocompleteReady(true)
    } catch (error) {
      console.error("Error setting up Google Places Autocomplete:", error)
    }
  }, [fetchLocationInfo, pathname, router, searchParams])

  // Function to start location tracking interval
  const startLocationTracking = useCallback(
    (fromButtonClick = false) => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current)
      }

      setIsTrackingLocation(true)
      // Only show loading state if explicitly requested from button click
      if (fromButtonClick) {
        setIsLocating(true)
      }

      const trackLocation = () => {
        if (!navigator.geolocation) return

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude: lat, longitude: lng, accuracy } = position.coords
            console.debug(`[Location Tracking] lat: ${lat}, lng: ${lng}, accuracy: ${accuracy}m`)

            setLatitude(lat)
            setLongitude(lng)
            setTempLat(lat)
            setTempLng(lng)

            // Update URL parameters with GPS location
            const currentParams = new URLSearchParams(searchParams.toString())
            currentParams.set("lat", lat.toString())
            currentParams.set("long", lng.toString())
            router.replace(`${pathname}?${currentParams.toString()}`, { scroll: false })

            // Update map if open
            if (mapInstanceRef.current) {
              const newCenter = { lat, lng }
              mapInstanceRef.current.setCenter(newCenter)
              if (accuracyCircleRef.current) {
                accuracyCircleRef.current.setCenter(newCenter)
                accuracyCircleRef.current.setRadius(accuracy || 50)
              }
            }

            fetchLocationInfo(lat, lng)

            // Stop loading state if it was from button click
            if (fromButtonClick) {
              setIsLocating(false)
            }

            // Show tooltip if we have good accuracy and location info
            if (accuracy < 100 && !tooltipDismissed) {
              setShowLocationTooltip(true)

              // Stop GPS pulsing when we get good accuracy
              setIsGpsPulsing(false)
              if (gpsPulseTimeoutRef.current) {
                clearTimeout(gpsPulseTimeoutRef.current)
              }
            } else if (fromButtonClick) {
              // Set timeout to stop pulsing after 2 seconds if we don't get good accuracy
              gpsPulseTimeoutRef.current = setTimeout(() => {
                setIsGpsPulsing(false)
              }, 2000)
            }
          },
          (error) => {
            console.error("Location tracking error:", error)
            if (fromButtonClick) {
              setIsLocating(false)

              // Stop GPS pulsing on error
              setIsGpsPulsing(false)
              if (gpsPulseTimeoutRef.current) {
                clearTimeout(gpsPulseTimeoutRef.current)
              }
            }
          },
          {
            enableHighAccuracy: true,
            maximumAge: 10000, // 10 seconds
            timeout: 15000
          }
        )
      }

      // Get initial location
      trackLocation()

      // Set up interval for continuous tracking (every 30 seconds)
      locationIntervalRef.current = setInterval(trackLocation, 30000)
    },
    [fetchLocationInfo, pathname, router, searchParams, mapOpen, tooltipDismissed]
  )

  // Function to stop location tracking
  const stopLocationTracking = useCallback(() => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current)
      locationIntervalRef.current = null
    }
    setIsTrackingLocation(false)
    setIsLocating(false)
  }, [])

  // Function to handle edit address click
  const handleEditAddress = useCallback(() => {
    setIsEditingAddress(true)

    // Stop location tracking - user is manually setting location
    stopLocationTracking()
    setShowLocationTooltip(false)

    // Setup autocomplete will be triggered by useEffect
  }, [stopLocationTracking])

  // Function to cancel address editing
  const handleCancelEdit = useCallback(() => {
    setIsEditingAddress(false)
    setAutocompleteReady(false)

    // Clean up autocomplete element
    if (autocompleteRef.current && autocompleteContainerRef.current) {
      autocompleteContainerRef.current.removeChild(autocompleteRef.current)
      autocompleteRef.current = null
    }
  }, [])

  // Function to get current GPS location (crosshairs button)
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.")
      return
    }

    // Start pulsing animation
    setIsGpsPulsing(true)

    // Clear any existing pulse timeout
    if (gpsPulseTimeoutRef.current) {
      clearTimeout(gpsPulseTimeoutRef.current)
    }

    // Reset URL parameters to remove any manual location setting
    const currentParams = new URLSearchParams(searchParams.toString())
    currentParams.delete("lat")
    currentParams.delete("long")
    router.replace(`${pathname}?${currentParams.toString()}`, { scroll: false })

    // Stop any existing tracking and start fresh
    stopLocationTracking()
    startLocationTracking(true) // true indicates this is from button click
  }, [pathname, router, searchParams, stopLocationTracking, startLocationTracking])

  // Function to handle location changes and trigger new search
  const handleLocationChange = useCallback(
    (newLat: number, newLng: number) => {
      setLatitude(newLat)
      setLongitude(newLng)
      setTempLat(newLat)
      setTempLng(newLng)

      const params = new URLSearchParams()
      params.append("lat", newLat.toString())
      params.append("long", newLng.toString())

      // If there's a search query or user wants taste-based search, search on homepage
      if (dishQuery.trim() || isUserLoggedIn) {
        // Preserve the current search query if it exists
        if (dishQuery.trim()) {
          params.append("q", dishQuery)
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

        // Navigate to homepage with new location parameters
        router.push(`/?${params.toString()}`)
      } else {
        // Just update current page URL with location parameters
        const currentParams = new URLSearchParams(searchParams.toString())
        currentParams.set("lat", newLat.toString())
        currentParams.set("long", newLng.toString())

        // Update URL without triggering navigation
        router.replace(`${pathname}?${currentParams.toString()}`, { scroll: false })
      }
    },
    [dishQuery, isUserLoggedIn, router, searchParams, pathname]
  )

  // Google Maps modal logic
  useEffect(() => {
    if (mapOpen && mapRef.current && tempLat !== null && tempLng !== null) {
      const loader = new GoogleMapsLoader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        version: "weekly",
        libraries: ["places"]
      })

      loader.load().then(() => {
        if (mapRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center: { lat: tempLat, lng: tempLng },
            zoom: 13,
            disableDefaultUI: true,
            scrollwheel: false,
            disableDoubleClickZoom: true,
            draggable: true,
            keyboardShortcuts: false
          })

          accuracyCircleRef.current = new google.maps.Circle({
            strokeColor: "#4285F4",
            strokeOpacity: 0.4,
            strokeWeight: 1,
            fillColor: "#4285F4",
            fillOpacity: 0.25,
            map: mapInstanceRef.current,
            center: { lat: tempLat, lng: tempLng },
            radius: 50
          })

          // Update location when map is dragged (manual interaction)
          mapInstanceRef.current.addListener("dragend", () => {
            const center = mapInstanceRef.current?.getCenter()
            if (center) {
              const lat = center.lat()
              const lng = center.lng()
              setTempLat(lat)
              setTempLng(lng)

              // Update main location state
              setLatitude(lat)
              setLongitude(lng)

              // Update URL parameters with new center position
              const currentParams = new URLSearchParams(searchParams.toString())
              currentParams.set("lat", lat.toString())
              currentParams.set("long", lng.toString())
              router.replace(`${pathname}?${currentParams.toString()}`, { scroll: false })

              if (accuracyCircleRef.current) {
                accuracyCircleRef.current.setCenter(center)
              }
              // Fetch location info for the new coordinates
              fetchLocationInfo(lat, lng)

              // Stop location tracking - user is manually setting location
              stopLocationTracking()
              setShowLocationTooltip(false)
            }
          })

          // Fetch initial location info when map loads
          if (tempLat && tempLng) {
            fetchLocationInfo(tempLat, tempLng)
          }
        }
      })

      return () => {
        // Cleanup
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.setMap(null)
          accuracyCircleRef.current = null
        }
        mapInstanceRef.current = null
      }
    }
  }, [mapOpen, tempLat, tempLng, fetchLocationInfo, pathname, router, searchParams, stopLocationTracking])

  // Auto-start location tracking if no URL parameters are present
  useEffect(() => {
    const hasUrlLocation = searchParams.get("lat") && searchParams.get("long")

    // Only start location tracking if:
    // 1. No URL location parameters
    // 2. No initial coordinates from props
    // 3. No current coordinates
    // 4. Not already tracking
    if (!hasUrlLocation && !initialLat && !initialLng && !latitude && !longitude && !isTrackingLocation) {
      startLocationTracking()
    }

    // If we have URL params, use those and don't track
    if (hasUrlLocation && !isTrackingLocation) {
      const latParam = searchParams.get("lat")
      const lngParam = searchParams.get("long")
      if (latParam && lngParam) {
        const lat = parseFloat(latParam)
        const lng = parseFloat(lngParam)
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          setLatitude(lat)
          setLongitude(lng)
          setTempLat(lat)
          setTempLng(lng)
          fetchLocationInfo(lat, lng)

          // Show location tooltip on page load when URL has location parameters
          if (!tooltipDismissed) {
            setShowLocationTooltip(true)
          }
        }
      }
    }
  }, [
    searchParams,
    initialLat,
    initialLng,
    latitude,
    longitude,
    isTrackingLocation,
    startLocationTracking,
    fetchLocationInfo,
    tooltipDismissed
  ])

  // Setup autocomplete when entering edit mode
  useEffect(() => {
    if (isEditingAddress && autocompleteContainerRef.current) {
      setupAutocomplete()
    }
  }, [isEditingAddress, setupAutocomplete])

  // Reset edit state when modal closes
  useEffect(() => {
    if (!mapOpen) {
      setIsEditingAddress(false)
      setAutocompleteReady(false)

      // Clean up autocomplete element
      if (autocompleteRef.current && autocompleteContainerRef.current) {
        autocompleteContainerRef.current.removeChild(autocompleteRef.current)
        autocompleteRef.current = null
      }
    }
  }, [mapOpen])

  // Cleanup location tracking on unmount
  useEffect(() => {
    return () => {
      stopLocationTracking()
      if (gpsPulseTimeoutRef.current) {
        clearTimeout(gpsPulseTimeoutRef.current)
      }
    }
  }, [stopLocationTracking])

  // Handle click outside map to close it
  useEffect(() => {
    if (!mapOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (mapContainerRef.current && !mapContainerRef.current.contains(event.target as Node)) {
        setMapOpen(false)
        // Only remove full-screen height if input is empty AND not focused
        if (dishQuery.trim() === "" && document.activeElement !== searchInputRef.current) {
          setUseFullScreenHeight(false)
        }
      }
    }

    // Add event listener with a small delay to avoid immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [mapOpen, dishQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (latitude === null || longitude === null) {
      alert("Please set your location to search.")
      return
    }

    // Check if the search query has actually changed
    const currentQuery = searchParams.get("q") || ""
    const currentTastes = searchParams.get("tastes") || ""
    const newQuery = dishQuery.trim()
    
    // If logged-in user with empty query wants taste search
    const wantsTasteSearch = isUserLoggedIn && newQuery === ""
    const hasTasteSearch = !!currentTastes
    
    // If query hasn't changed and search type hasn't changed, don't re-search
    if (currentQuery === newQuery && wantsTasteSearch === hasTasteSearch) {
      return // No change, keep current results
    }

    const params = new URLSearchParams()
    params.append("lat", latitude.toString())
    params.append("long", longitude.toString())

    // If user is logged in and search box is empty, use taste-based search
    if (wantsTasteSearch) {
      params.append("tastes", "true")
    }
    // Otherwise, require a query term
    else if (!newQuery) {
      alert("Please enter a dish to search.")
      return
    } else {
      // Add query param when search box has content
      params.append("q", newQuery)
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

    // Stay on homepage with search parameters
    router.push(`/?${params.toString()}`)
  }

  const canSearch = (isUserLoggedIn || dishQuery.trim() !== "") && latitude !== null && longitude !== null

  // Handle clear button click - clear search and focus input
  const handleClearSearch = useCallback(() => {
    setDishQuery("")
    searchInputRef.current?.focus()
  }, [])

  // Handle search input blur - just cleanup UI state
  const handleSearchBlur = useCallback(() => {
    // Only remove full-screen height if input is empty after blur
    if (dishQuery.trim() === "") {
      setUseFullScreenHeight(false)
    }
    // Don't automatically clear search results on blur - let the user keep their results
  }, [dishQuery])

  return (
    <form
      ref={searchFormRef}
      onSubmit={handleSearch}
      className={`w-full max-w-full sm:max-w-[850px] ${
        useFullScreenHeight ? "min-h-screen" : ""
      }`}
    >
      <div className="relative w-full">
        <div className="relative flex items-center w-full px-2 sm:px-4 bg-white rounded-full shadow-md border focus-within:shadow-lg transition-all duration-200">
          <div className="flex-shrink-0 mr-2 sm:mr-3 bg-brand-bg rounded-full p-1">
            <Image src="/img/dishola_logo_32x32.png" alt="Dishola" width={24} height={24} className="w-6 h-6" />
          </div>

          {/* Input field */}
          <input
            ref={searchInputRef}
            type="text"
            value={dishQuery}
            onChange={(e) => setDishQuery(e.target.value)}
            onFocus={() => {
              setShowLocationTooltip(false)
              setTooltipDismissed(true) // Permanently dismiss tooltip for this session
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('locationTooltipDismissed', 'true')
              }
              
              // Only use full screen height if we're not already showing search results
              const hasExistingSearch = searchParams.get('q') || searchParams.get('tastes')
              if (!hasExistingSearch) {
                setUseFullScreenHeight(true)
              }

              // Only scroll if input is not already near the top
              setTimeout(() => {
                if (searchFormRef.current) {
                  const elementTop = searchFormRef.current.getBoundingClientRect().top
                  const offset = 8 // 8px margin (equivalent to Tailwind's "2")
                  
                  // Only scroll if element is more than 20px from the desired position
                  if (elementTop > offset + 20) {
                    window.scrollTo({
                      top: searchFormRef.current.getBoundingClientRect().top + window.pageYOffset - offset,
                      behavior: "smooth"
                    })
                  }
                }
              }, 100) // Small delay to ensure full-screen height is applied
            }}
            onBlur={handleSearchBlur}
            placeholder="What are you craving?"
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-lg py-3"
          />

          {/* Clear button */}
          {dishQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Separator line */}
          {(dishQuery || true) && <div className="flex-shrink-0 w-px h-10 bg-gray-300 mx-1" />}

          {/* Map button */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation() // Prevent event bubbling to avoid conflict with click outside handler
                
                if (mapOpen) {
                  setMapOpen(false)
                  // Only remove full-screen height if input is empty AND not focused
                  if (dishQuery.trim() === "" && document.activeElement !== searchInputRef.current) {
                    setUseFullScreenHeight(false)
                  }
                } else {
                  // Close tooltip and start location tracking if no URL params
                  setShowLocationTooltip(false)
                  const hasUrlLocation = searchParams.get("lat") && searchParams.get("long")
                  if (!hasUrlLocation) {
                    startLocationTracking()
                  }

                  setTempLat(latitude || 37.7749)
                  setTempLng(longitude || -122.4194)
                  setMapOpen(true)
                  
                  // Only use full screen height if we're not already showing search results
                  const hasExistingSearch = searchParams.get('q') || searchParams.get('tastes')
                  if (!hasExistingSearch) {
                    setUseFullScreenHeight(true)
                  }

                  // Scroll to position the search input at the top of the viewport with small margin
                  setTimeout(() => {
                    if (searchFormRef.current) {
                      const elementTop = searchFormRef.current.getBoundingClientRect().top + window.pageYOffset
                      const offset = 8 // 8px margin (equivalent to Tailwind's "2")
                      window.scrollTo({
                        top: elementTop - offset,
                        behavior: "smooth"
                      })
                    }
                  }, 100) // Small delay to ensure map is rendered
                }
              }}
              className={`flex-shrink-0 p-2 transition-colors duration-200 ${
                mapOpen ? "text-blue-600 hover:text-blue-700" : "text-gray-400 hover:text-gray-600"
              }`}
              disabled={isLocating}
              aria-label={mapOpen ? "Close map" : "Open map"}
            >
              {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapIcon className="w-5 h-5" />}
            </button>

            {/* Location Tooltip */}
            {showLocationTooltip && locationInfo && !mapOpen && (
              <div className="absolute bottom-full mb-4 right-0 sm:left-1/2 sm:transform sm:-translate-x-1/2 bg-white border border-gray-200 rounded-xl shadow-md px-3 py-2 min-w-36 sm:min-w-48 max-w-64 sm:mr-0 z-50">
                <div className="flex items-center gap-2 text-left">
                  <BluePulseDot />
                  <div className="text-sm text-left">
                    <div className="font-medium text-gray-900 text-left truncate">
                      {locationInfo.neighborhood || locationInfo.city}
                    </div>
                    {locationInfo.neighborhood && locationInfo.city && (
                      <div className="text-gray-500 text-left truncate">{locationInfo.city}</div>
                    )}
                  </div>
                </div>
                {/* Tooltip arrow - positioned to point at the map icon */}
                <div className="absolute top-full right-4 sm:left-1/2 sm:right-auto sm:transform sm:-translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white drop-shadow-sm"></div>
              </div>
            )}
          </div>

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
        <div ref={mapContainerRef} className="mt-2 sm:relative sm:w-full w-screen -ml-2 sm:w-full sm:ml-0">
          <div className="relative overflow-hidden sm:rounded-t-xl sm:rounded-bl-xl sm:rounded-br-xl px-2 sm:px-0">
            <div ref={mapRef} style={{ width: "100%", height: "400px" }} />
            {/* Absolutely positioned blue dot in the center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
              <BluePulseDot />
            </div>
            {/* Get My Location button - positioned like Google Maps */}
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isLocating}
              className={`absolute bottom-4 right-4 w-10 h-10 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center border border-gray-200 disabled:opacity-75 ${
                isGpsPulsing ? "relative" : ""
              }`}
              aria-label="Get my location"
            >
              {isGpsPulsing && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60 animate-blue-dot-pulse"></span>
              )}
              <Crosshair
                className={`w-5 h-5 relative z-10 ${
                  isGpsPulsing ? "text-blue-600" : isLocating ? "text-blue-600" : "text-gray-600"
                }`}
              />
            </button>
          </div>
          {/* Location info and confirm button */}
          <div className="mt-0 bg-gray-50 sm:rounded-bl-xl sm:rounded-br-xl p-3 mx-2 sm:mx-0">
            {isEditingAddress ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  {/* Container div for the PlaceAutocompleteElement */}
                  <div ref={autocompleteContainerRef} className="w-full" />
                </div>
                <Button type="button" onClick={handleCancelEdit} size="sm" variant="outline">
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (tempLat !== null && tempLng !== null) {
                      handleLocationChange(tempLat, tempLng)
                    }
                    setIsEditingAddress(false)
                    setMapOpen(false)
                  }}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Save
                </Button>
              </div>
            ) : (
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
          </div>
        </div>
      )}
    </form>
  )
}
