"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, MapPin, SearchIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function SearchSection() {
  const [dishQuery, setDishQuery] = useState("")
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [locationStatus, setLocationStatus] = useState("Set your location to search")
  const [isLocating, setIsLocating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const storedLat = localStorage.getItem("dishola_lat")
    const storedLng = localStorage.getItem("dishola_lng")
    if (storedLat && storedLng) {
      setLatitude(Number.parseFloat(storedLat))
      setLongitude(Number.parseFloat(storedLng))
      setLocationStatus(
        `Location set (Lat: ${Number.parseFloat(storedLat).toFixed(2)}, Lng: ${Number.parseFloat(storedLng).toFixed(2)})`,
      )
    }
  }, [])

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not supported by your browser.")
      return
    }

    setIsLocating(true)
    setLocationStatus("Fetching location...")
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords
        setLatitude(lat)
        setLongitude(lng)
        localStorage.setItem("dishola_lat", lat.toString())
        localStorage.setItem("dishola_lng", lng.toString())
        setLocationStatus(`Location set (Lat: ${lat.toFixed(2)}, Lng: ${lng.toFixed(2)})`)
        setIsLocating(false)
      },
      (error) => {
        console.error("Geolocation error:", error)
        setLocationStatus(`Error: ${error.message}. Please set location manually or check permissions.`)
        setIsLocating(false)
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    )
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!dishQuery.trim() || latitude === null || longitude === null) {
      alert("Please enter a dish and set your location to search.")
      return
    }
    router.push(`/search?q=${encodeURIComponent(dishQuery)}&lat=${latitude}&long=${longitude}`)
  }

  const canSearch = dishQuery.trim() !== "" && latitude !== null && longitude !== null

  return (
    <form onSubmit={handleSearch} className="w-full max-w-xl space-y-6">
      <div>
        <label htmlFor="dishQuery" className="block text-sm font-medium text-brand-text-muted mb-1">
          What dish are you craving?
        </label>
        <Input
          id="dishQuery"
          type="text"
          value={dishQuery}
          onChange={(e) => setDishQuery(e.target.value)}
          placeholder="e.g., Spicy Ramen, Tacos al Pastor, Best Burger"
          className="input-custom w-full text-lg p-3"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-text-muted mb-1">Location</label>
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            onClick={handleGeolocate}
            variant="outline"
            className="btn-custom-secondary flex-grow sm:flex-grow-0 whitespace-nowrap"
            disabled={isLocating}
          >
            {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
            Use Current Location
          </Button>
          <p className="text-sm text-brand-text-muted flex-grow truncate p-2 border border-transparent rounded-md bg-white/50">
            {locationStatus}
          </p>
        </div>
      </div>

      <Button type="submit" className="btn-custom-primary w-full text-lg p-3" disabled={!canSearch || isLocating}>
        <SearchIcon className="mr-2 h-5 w-5" />
        Find My Dish
      </Button>
    </form>
  )
}
