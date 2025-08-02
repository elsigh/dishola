import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { API_BASE_URL } from "@/lib/constants"

export function useLocationData() {
  const { user, getAuthToken } = useAuth()
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [neighborhood, setNeighborhood] = useState<string | undefined>(undefined)
  const [city, setCity] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords
          setLatitude(lat)
          setLongitude(lng)
        },
        (error) => {
          console.error("Geolocation error:", error)
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      )
    }
  }, [])

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

        const response = await fetch(`${API_BASE_URL}/api/taste-recommendations?lat=${latitude}&long=${longitude}`, {
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
