/**
 * Shared search cache for AI search results
 */
interface SearchCacheEntry {
  data: Record<string, unknown>
  timestamp: number
}

export class SearchCache {
  private cache: Map<string, SearchCacheEntry> = new Map()
  private readonly maxAge: number

  constructor(maxAgeMs = 10 * 60 * 1000) {
    // 10 minutes default
    this.maxAge = maxAgeMs
  }

  get(key: string): Record<string, unknown> | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set(key: string, data: Record<string, unknown>): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  clear(): void {
    this.cache.clear()
  }

  // For debugging/monitoring
  getStats(): { size: number; maxAge: number } {
    return {
      size: this.cache.size,
      maxAge: this.maxAge
    }
  }

  // Helper to create cache key
  createKey(q: string, lat: string, long: string, tastes: string | undefined, sort: string | undefined): string {
    return JSON.stringify({ q, lat, long, tastes, sort })
  }
}

// Create a singleton instance
export const searchCache = new SearchCache()