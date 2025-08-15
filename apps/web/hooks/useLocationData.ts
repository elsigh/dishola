import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { API_BASE_URL } from "@/lib/constants"

interface UseLocationDataProps {
  urlLat?: string | null
  urlLng?: string | null
}

export function useLocationData(props?: UseLocationDataProps) {
  const { user, getAuthToken } = useAuth()
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [neighborhood, setNeighborhood] = useState<string | undefined>(undefined)
  const [city, setCity] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)

  // Prioritize URL parameters over geolocation
  useEffect(() => {
    if (props?.urlLat && props?.urlLng) {
      // Use coordinates from URL
      const lat = parseFloat(props.urlLat)
      const lng = parseFloat(props.urlLng)
      if (!isNaN(lat) && !isNaN(lng)) {
        setLatitude(lat)
        setLongitude(lng)
        return // Skip geolocation
      }
    }

    // Only use geolocation if no URL coordinates
    if (navigator.geolocation) {
      setIsLoading(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords
          setLatitude(lat)
          setLongitude(lng)
          setIsLoading(false)
        },
        (error) => {
          console.error("Geolocation error:", error)
          setIsLoading(false)
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      )
    }
  }, [props?.urlLat, props?.urlLng])

  useEffect(() => {
    const fetchLocationData = async () => {
      if (!user || !latitude || !longitude) return

      try {
        setIsLoading(true)
        let token: string | null = null
        try {
          token = getAuthToken()
        } catch (error) {
          console.warn("Could not get auth token:", error)
        }

        if (!token) {
          console.error("No auth token available")
          setIsLoading(false)
          return
        }

        const response = await fetch(`${API_BASE_URL}/api/geocode?lat=${latitude}&lng=${longitude}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setNeighborhood(data.neighborhood)
          setCity(data.city)
        }
      } catch (error) {
        console.error("Error fetching location data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchLocationData()
  }, [user, latitude, longitude])

  return { latitude, longitude, neighborhood, city, isLoading }
}
