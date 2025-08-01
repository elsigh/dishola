/**
 * Location utility functions for Dishola
 */

/**
 * Represents a location with coordinates and additional information
 */
export interface LocationInfo {
  lat: number
  lng: number
  neighborhood?: string
  city?: string
  displayName?: string
}

/**
 * Gets neighborhood information based on coordinates using Google Maps Geocoding API
 *
 * @param lat Latitude
 * @param lng Longitude
 * @returns Promise with location info including neighborhood if available
 */
export async function getNeighborhoodFromCoords(lat: number, lng: number): Promise<LocationInfo> {
  try {
    // Make sure we have the API key
    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      console.warn("Google Maps API key not found. Neighborhood lookup will not work.")
      return { lat, lng }
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== "OK") {
      console.warn("Geocoding API error:", data.status)
      return { lat, lng }
    }

    // Extract location information from results
    const locationInfo: LocationInfo = { lat, lng }

    // Parse address components to find neighborhood, locality, etc.
    if (data.results && data.results.length > 0) {
      const addressComponents = data.results[0].address_components

      for (const component of addressComponents) {
        const types = component.types

        // Look for neighborhood
        if (types.includes("neighborhood") || types.includes("sublocality_level_1")) {
          locationInfo.neighborhood = component.long_name
        }

        // Look for city
        if (types.includes("locality")) {
          locationInfo.city = component.long_name
        }
      }

      // Create a display name
      if (locationInfo.neighborhood && locationInfo.city) {
        locationInfo.displayName = `${locationInfo.neighborhood}, ${locationInfo.city}`
      } else if (locationInfo.neighborhood) {
        locationInfo.displayName = locationInfo.neighborhood
      } else if (locationInfo.city) {
        locationInfo.displayName = locationInfo.city
      }
    }

    return locationInfo
  } catch (error) {
    console.error("Error getting neighborhood information:", error)
    return { lat, lng }
  }
}

/**
 * A simpler fallback method that uses a predefined list of neighborhoods for major cities
 * This can be used when the Google Maps API is not available or as a fallback
 *
 * @param lat Latitude
 * @param lng Longitude
 * @returns LocationInfo with neighborhood if found
 */
export function getNeighborhoodFallback(lat: number, lng: number): LocationInfo {
  // San Francisco neighborhoods with approximate bounding boxes
  const sfNeighborhoods = [
    { name: "Mission", bounds: { minLat: 37.748, maxLat: 37.765, minLng: -122.426, maxLng: -122.401 } },
    { name: "SoMa", bounds: { minLat: 37.765, maxLat: 37.789, minLng: -122.42, maxLng: -122.39 } },
    { name: "Financial District", bounds: { minLat: 37.789, maxLat: 37.799, minLng: -122.41, maxLng: -122.392 } },
    { name: "North Beach", bounds: { minLat: 37.797, maxLat: 37.81, minLng: -122.417, maxLng: -122.395 } },
    { name: "Marina", bounds: { minLat: 37.797, maxLat: 37.81, minLng: -122.446, maxLng: -122.42 } },
    { name: "Pacific Heights", bounds: { minLat: 37.787, maxLat: 37.797, minLng: -122.446, maxLng: -122.42 } },
    { name: "Hayes Valley", bounds: { minLat: 37.773, maxLat: 37.78, minLng: -122.43, maxLng: -122.418 } },
    { name: "Castro", bounds: { minLat: 37.757, maxLat: 37.767, minLng: -122.44, maxLng: -122.425 } },
    { name: "Haight-Ashbury", bounds: { minLat: 37.764, maxLat: 37.775, minLng: -122.452, maxLng: -122.435 } },
    { name: "Sunset", bounds: { minLat: 37.74, maxLat: 37.765, minLng: -122.51, maxLng: -122.46 } },
    { name: "Richmond", bounds: { minLat: 37.765, maxLat: 37.785, minLng: -122.51, maxLng: -122.46 } },
    { name: "Noe Valley", bounds: { minLat: 37.74, maxLat: 37.755, minLng: -122.44, maxLng: -122.42 } },
    { name: "Dogpatch", bounds: { minLat: 37.75, maxLat: 37.765, minLng: -122.4, maxLng: -122.385 } },
    { name: "Potrero Hill", bounds: { minLat: 37.75, maxLat: 37.765, minLng: -122.41, maxLng: -122.39 } },
    { name: "Chinatown", bounds: { minLat: 37.79, maxLat: 37.799, minLng: -122.415, maxLng: -122.4 } },
    { name: "Russian Hill", bounds: { minLat: 37.797, maxLat: 37.805, minLng: -122.425, maxLng: -122.41 } }
  ]

  // Check if coordinates are within San Francisco
  const isSF = lat >= 37.7 && lat <= 37.82 && lng >= -122.52 && lng <= -122.35

  if (isSF) {
    // Find matching neighborhood
    for (const hood of sfNeighborhoods) {
      const { bounds } = hood
      if (lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng) {
        return {
          lat,
          lng,
          neighborhood: hood.name,
          city: "San Francisco",
          displayName: `${hood.name}, San Francisco`
        }
      }
    }

    // If no specific neighborhood found but still in SF
    return {
      lat,
      lng,
      city: "San Francisco",
      displayName: "San Francisco"
    }
  }

  // Default return with just coordinates
  return { lat, lng }
}

/**
 * Gets neighborhood information using the best available method
 * Tries Google Maps API first, then falls back to local lookup
 *
 * @param lat Latitude
 * @param lng Longitude
 * @returns Promise with location info
 */
export async function getLocationInfo(lat: number, lng: number): Promise<LocationInfo> {
  try {
    // First try Google Maps API
    const googleResult = await getNeighborhoodFromCoords(lat, lng)

    // If we got neighborhood info, return it
    if (googleResult.neighborhood || googleResult.city) {
      return googleResult
    }

    // Otherwise fall back to local lookup
    return getNeighborhoodFallback(lat, lng)
  } catch (error) {
    console.error("Error in getLocationInfo:", error)
    // Final fallback
    return getNeighborhoodFallback(lat, lng)
  }
}
