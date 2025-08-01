/**
 * Location utility functions for Dishola API
 */

/**
 * Represents a location with coordinates and additional information
 */
export interface LocationInfo {
  lat: string
  long: string
  address?: string
  neighborhood?: string
  city?: string
  displayName?: string
}

/**
 * Gets neighborhood information based on coordinates
 * This is a server-side version that uses Vercel headers when available
 *
 * @param lat Latitude
 * @param lng Longitude
 * @param headers Request headers (for Vercel geolocation)
 * @returns LocationInfo with neighborhood if available
 */
export function getNeighborhoodInfo(lat: string, lng: string, headers: any = {}): LocationInfo {
  const locationInfo: LocationInfo = { lat, long: lng }

  // Get city from Vercel headers if available
  const city = headers["x-vercel-ip-city"]
  if (city) {
    locationInfo.city = city
  }

  // Get neighborhood based on coordinates
  const neighborhood = getNeighborhoodFromCoords(parseFloat(lat), parseFloat(lng))
  if (neighborhood) {
    locationInfo.neighborhood = neighborhood
  }

  // Create display name
  if (locationInfo.neighborhood && locationInfo.city) {
    locationInfo.displayName = `${locationInfo.neighborhood}, ${locationInfo.city}`
  } else if (locationInfo.neighborhood) {
    locationInfo.displayName = locationInfo.neighborhood
  } else if (locationInfo.city) {
    locationInfo.displayName = locationInfo.city
  } else {
    // Fallback to coordinates
    locationInfo.displayName = `${lat}, ${lng}`
  }

  return locationInfo
}

/**
 * Gets neighborhood name based on coordinates
 * Uses a predefined list of neighborhoods for major cities
 *
 * @param lat Latitude
 * @param lng Longitude
 * @returns Neighborhood name if found, undefined otherwise
 */
export function getNeighborhoodFromCoords(lat: number, lng: number): string | undefined {
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
    { name: "Russian Hill", bounds: { minLat: 37.797, maxLat: 37.805, minLng: -122.425, maxLng: -122.41 } },
    { name: "Lower Haight", bounds: { minLat: 37.77, maxLat: 37.775, minLng: -122.435, maxLng: -122.425 } },
    { name: "Tenderloin", bounds: { minLat: 37.78, maxLat: 37.789, minLng: -122.42, maxLng: -122.405 } },
    { name: "Japantown", bounds: { minLat: 37.78, maxLat: 37.788, minLng: -122.435, maxLng: -122.425 } },
    { name: "Presidio", bounds: { minLat: 37.785, maxLat: 37.81, minLng: -122.485, maxLng: -122.445 } },
    { name: "Embarcadero", bounds: { minLat: 37.79, maxLat: 37.81, minLng: -122.405, maxLng: -122.385 } }
  ]

  // Check if coordinates are within San Francisco
  const isSF = lat >= 37.7 && lat <= 37.82 && lng >= -122.52 && lng <= -122.35

  if (isSF) {
    // Find matching neighborhood
    for (const hood of sfNeighborhoods) {
      const { bounds } = hood
      if (lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng) {
        return hood.name
      }
    }
  }

  // NYC neighborhoods (simplified version)
  const nycNeighborhoods = [
    { name: "Manhattan", bounds: { minLat: 40.7, maxLat: 40.82, minLng: -74.02, maxLng: -73.92 } },
    { name: "Brooklyn", bounds: { minLat: 40.57, maxLat: 40.74, minLng: -74.04, maxLng: -73.83 } },
    { name: "Queens", bounds: { minLat: 40.54, maxLat: 40.8, minLng: -73.95, maxLng: -73.7 } },
    { name: "Bronx", bounds: { minLat: 40.785, maxLat: 40.915, minLng: -73.93, maxLng: -73.765 } },
    { name: "Staten Island", bounds: { minLat: 40.49, maxLat: 40.65, minLng: -74.25, maxLng: -74.05 } }
  ]

  // Check if coordinates are within NYC
  const isNYC = lat >= 40.49 && lat <= 40.915 && lng >= -74.25 && lng <= -73.7

  if (isNYC) {
    for (const hood of nycNeighborhoods) {
      const { bounds } = hood
      if (lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng) {
        return hood.name
      }
    }
  }

  // Austin neighborhoods (simplified)
  const austinNeighborhoods = [
    { name: "Downtown Austin", bounds: { minLat: 30.26, maxLat: 30.29, minLng: -97.76, maxLng: -97.73 } },
    { name: "South Congress", bounds: { minLat: 30.23, maxLat: 30.26, minLng: -97.76, maxLng: -97.74 } },
    { name: "East Austin", bounds: { minLat: 30.26, maxLat: 30.29, minLng: -97.73, maxLng: -97.7 } },
    { name: "Hyde Park", bounds: { minLat: 30.29, maxLat: 30.31, minLng: -97.74, maxLng: -97.72 } },
    { name: "Zilker", bounds: { minLat: 30.25, maxLat: 30.27, minLng: -97.78, maxLng: -97.76 } }
  ]

  // Check if coordinates are within Austin
  const isAustin = lat >= 30.22 && lat <= 30.32 && lng >= -97.8 && lng <= -97.68

  if (isAustin) {
    for (const hood of austinNeighborhoods) {
      const { bounds } = hood
      if (lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng) {
        return hood.name
      }
    }
  }

  // Return undefined if no neighborhood found
  return undefined
}
