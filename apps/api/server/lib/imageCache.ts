/**
 * Simple in-memory cache for image search results
 * Keys are query strings, values are image URLs
 */
interface CacheEntry {
	url: string;
	timestamp: number;
}

// Cache with expiration (24 hours by default)
export class ImageCache {
	private cache: Map<string, CacheEntry> = new Map();
	private readonly maxAge: number;

	constructor(maxAgeMs = 24 * 60 * 60 * 1000) {
		// 24 hours default
		this.maxAge = maxAgeMs;
	}

	get(key: string): string | null {
		const entry = this.cache.get(key);
		if (!entry) return null;

		// Check if entry has expired
		if (Date.now() - entry.timestamp > this.maxAge) {
			this.cache.delete(key);
			return null;
		}

		return entry.url;
	}

	set(key: string, url: string): void {
		this.cache.set(key, {
			url,
			timestamp: Date.now(),
		});
	}

	// For debugging/monitoring
	getStats(): { size: number } {
		return {
			size: this.cache.size,
		};
	}
}

// Create a singleton instance
export const imageCache = new ImageCache();
