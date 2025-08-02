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
 * Top 50 US cities with their approximate bounding boxes
 * Sorted by population for faster lookup of most common cities
 */
const US_CITIES = [
  { name: "New York", state: "NY", bounds: { minLat: 40.477, maxLat: 40.917, minLng: -74.259, maxLng: -73.700 } },
  { name: "Los Angeles", state: "CA", bounds: { minLat: 33.704, maxLat: 34.337, minLng: -118.668, maxLng: -118.155 } },
  { name: "Chicago", state: "IL", bounds: { minLat: 41.644, maxLat: 42.023, minLng: -87.940, maxLng: -87.524 } },
  { name: "Houston", state: "TX", bounds: { minLat: 29.523, maxLat: 30.110, minLng: -95.823, maxLng: -95.069 } },
  { name: "Phoenix", state: "AZ", bounds: { minLat: 33.295, maxLat: 33.745, minLng: -112.372, maxLng: -111.933 } },
  { name: "Philadelphia", state: "PA", bounds: { minLat: 39.867, maxLat: 40.138, minLng: -75.280, maxLng: -74.956 } },
  { name: "San Antonio", state: "TX", bounds: { minLat: 29.213, maxLat: 29.699, minLng: -98.830, maxLng: -98.307 } },
  { name: "San Diego", state: "CA", bounds: { minLat: 32.534, maxLat: 33.114, minLng: -117.289, maxLng: -116.906 } },
  { name: "Dallas", state: "TX", bounds: { minLat: 32.617, maxLat: 33.023, minLng: -96.999, maxLng: -96.569 } },
  { name: "San Jose", state: "CA", bounds: { minLat: 37.209, maxLat: 37.469, minLng: -122.060, maxLng: -121.693 } },
  { name: "Austin", state: "TX", bounds: { minLat: 30.098, maxLat: 30.516, minLng: -97.938, maxLng: -97.563 } },
  { name: "Jacksonville", state: "FL", bounds: { minLat: 30.103, maxLat: 30.632, minLng: -82.075, maxLng: -81.379 } },
  { name: "Fort Worth", state: "TX", bounds: { minLat: 32.534, maxLat: 32.959, minLng: -97.533, maxLng: -97.036 } },
  { name: "Columbus", state: "OH", bounds: { minLat: 39.886, maxLat: 40.157, minLng: -83.188, maxLng: -82.799 } },
  { name: "San Francisco", state: "CA", bounds: { minLat: 37.708, maxLat: 37.833, minLng: -122.515, maxLng: -122.357 } },
  { name: "Charlotte", state: "NC", bounds: { minLat: 35.095, maxLat: 35.370, minLng: -80.967, maxLng: -80.648 } },
  { name: "Indianapolis", state: "IN", bounds: { minLat: 39.632, maxLat: 39.928, minLng: -86.328, maxLng: -85.938 } },
  { name: "Seattle", state: "WA", bounds: { minLat: 47.481, maxLat: 47.734, minLng: -122.459, maxLng: -122.224 } },
  { name: "Denver", state: "CO", bounds: { minLat: 39.614, maxLat: 39.914, minLng: -105.110, maxLng: -104.601 } },
  { name: "Washington", state: "DC", bounds: { minLat: 38.791, maxLat: 38.996, minLng: -77.119, maxLng: -76.910 } },
  { name: "Nashville", state: "TN", bounds: { minLat: 36.003, maxLat: 36.255, minLng: -87.046, maxLng: -86.651 } },
  { name: "Oklahoma City", state: "OK", bounds: { minLat: 35.333, maxLat: 35.681, minLng: -97.718, maxLng: -97.315 } },
  { name: "El Paso", state: "TX", bounds: { minLat: 31.655, maxLat: 31.896, minLng: -106.649, maxLng: -106.243 } },
  { name: "Boston", state: "MA", bounds: { minLat: 42.228, maxLat: 42.400, minLng: -71.191, maxLng: -70.986 } },
  { name: "Portland", state: "OR", bounds: { minLat: 45.421, maxLat: 45.650, minLng: -122.849, maxLng: -122.471 } },
  { name: "Las Vegas", state: "NV", bounds: { minLat: 35.960, maxLat: 36.341, minLng: -115.373, maxLng: -114.982 } },
  { name: "Detroit", state: "MI", bounds: { minLat: 42.255, maxLat: 42.450, minLng: -83.287, maxLng: -82.910 } },
  { name: "Memphis", state: "TN", bounds: { minLat: 34.987, maxLat: 35.261, minLng: -90.310, maxLng: -89.643 } },
  { name: "Louisville", state: "KY", bounds: { minLat: 38.142, maxLat: 38.365, minLng: -85.864, maxLng: -85.493 } },
  { name: "Baltimore", state: "MD", bounds: { minLat: 39.197, maxLat: 39.372, minLng: -76.712, maxLng: -76.529 } },
  { name: "Milwaukee", state: "WI", bounds: { minLat: 42.917, maxLat: 43.192, minLng: -88.071, maxLng: -87.843 } },
  { name: "Albuquerque", state: "NM", bounds: { minLat: 35.005, maxLat: 35.310, minLng: -106.815, maxLng: -106.448 } },
  { name: "Tucson", state: "AZ", bounds: { minLat: 32.068, maxLat: 32.341, minLng: -111.168, maxLng: -110.747 } },
  { name: "Fresno", state: "CA", bounds: { minLat: 36.695, maxLat: 36.885, minLng: -119.875, maxLng: -119.652 } },
  { name: "Mesa", state: "AZ", bounds: { minLat: 33.314, maxLat: 33.506, minLng: -111.719, maxLng: -111.583 } },
  { name: "Sacramento", state: "CA", bounds: { minLat: 38.481, maxLat: 38.685, minLng: -121.594, maxLng: -121.302 } },
  { name: "Atlanta", state: "GA", bounds: { minLat: 33.649, maxLat: 33.887, minLng: -84.552, maxLng: -84.290 } },
  { name: "Kansas City", state: "MO", bounds: { minLat: 39.011, maxLat: 39.201, minLng: -94.752, maxLng: -94.480 } },
  { name: "Colorado Springs", state: "CO", bounds: { minLat: 38.701, maxLat: 38.936, minLng: -104.874, maxLng: -104.609 } },
  { name: "Miami", state: "FL", bounds: { minLat: 25.700, maxLat: 25.855, minLng: -80.313, maxLng: -80.134 } },
  { name: "Raleigh", state: "NC", bounds: { minLat: 35.731, maxLat: 35.877, minLng: -78.721, maxLng: -78.542 } },
  { name: "Omaha", state: "NE", bounds: { minLat: 41.214, maxLat: 41.372, minLng: -96.190, maxLng: -95.865 } },
  { name: "Long Beach", state: "CA", bounds: { minLat: 33.748, maxLat: 33.885, minLng: -118.250, maxLng: -118.063 } },
  { name: "Virginia Beach", state: "VA", bounds: { minLat: 36.678, maxLat: 36.886, minLng: -76.174, maxLng: -75.916 } },
  { name: "Oakland", state: "CA", bounds: { minLat: 37.696, maxLat: 37.885, minLng: -122.355, maxLng: -122.114 } },
  { name: "Minneapolis", state: "MN", bounds: { minLat: 44.890, maxLat: 45.051, minLng: -93.329, maxLng: -93.193 } },
  { name: "Tulsa", state: "OK", bounds: { minLat: 36.066, maxLat: 36.230, minLng: -96.025, maxLng: -95.865 } },
  { name: "Tampa", state: "FL", bounds: { minLat: 27.877, maxLat: 28.016, minLng: -82.638, maxLng: -82.394 } },
  { name: "Arlington", state: "TX", bounds: { minLat: 32.653, maxLat: 32.787, minLng: -97.222, maxLng: -97.030 } },
  { name: "New Orleans", state: "LA", bounds: { minLat: 29.867, maxLat: 30.199, minLng: -90.140, maxLng: -89.625 } }
]

/**
 * Fast in-memory city lookup using bounding boxes
 */
function getCityFromCoordinates(lat: number, lng: number): { name: string; state: string } | undefined {
  // Check against our city boundaries (most common cities first for performance)
  for (const city of US_CITIES) {
    const { bounds } = city
    if (lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng) {
      return { name: city.name, state: city.state }
    }
  }
  return undefined
}

/**
 * Fast synchronous location lookup using only in-memory data
 * Perfect for server-side rendering without network requests
 *
 * @param lat Latitude
 * @param lng Longitude
 * @returns LocationInfo with neighborhood and city if found
 */
export function getLocationInfo(lat: number, lng: number): LocationInfo {
  const locationInfo: LocationInfo = { lat, lng }

  // Get city from in-memory lookup
  const inMemoryCity = getCityFromCoordinates(lat, lng)
  if (inMemoryCity) {
    locationInfo.city = inMemoryCity.name
  }

  // Get neighborhood using existing fallback logic
  const fallbackResult = getNeighborhoodFallback(lat, lng)
  if (fallbackResult.neighborhood) {
    locationInfo.neighborhood = fallbackResult.neighborhood
  }

  // Create display name, prioritizing neighborhood over city lookup
  if (locationInfo.neighborhood && locationInfo.city) {
    locationInfo.displayName = `${locationInfo.neighborhood}, ${locationInfo.city}`
  } else if (locationInfo.neighborhood) {
    locationInfo.displayName = locationInfo.neighborhood
  } else if (locationInfo.city) {
    locationInfo.displayName = locationInfo.city
  }

  return locationInfo
}

/**
 * Async version that tries Google Maps API first, then falls back to local lookup
 * Use this when you need the most accurate results and don't mind network requests
 *
 * @param lat Latitude
 * @param lng Longitude
 * @returns Promise with location info
 */
export async function getLocationInfoWithNetwork(lat: number, lng: number): Promise<LocationInfo> {
  try {
    // First try Google Maps API
    const googleResult = await getNeighborhoodFromCoords(lat, lng)

    // If we got neighborhood info, return it
    if (googleResult.neighborhood || googleResult.city) {
      return googleResult
    }

    // Otherwise fall back to local lookup
    return getLocationInfo(lat, lng)
  } catch (error) {
    console.error("Error in getLocationInfoWithNetwork:", error)
    // Final fallback to local lookup
    return getLocationInfo(lat, lng)
  }
}
