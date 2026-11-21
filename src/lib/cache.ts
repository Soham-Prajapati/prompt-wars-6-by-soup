/**
 * Bounded In-Memory LRU Cache with TTL and In-Flight Request Deduplication.
 *
 * Prevents redundant upstream API calls to Open-Meteo, protects upstream rate limits,
 * and collapses concurrent in-flight requests for identical geographic coordinates.
 *
 * Coordinates are rounded to 2 decimal places (~1.1 km resolution), which clusters
 * neighbourhood queries into single cache hits while preserving meteorological accuracy.
 */

interface CacheEntry<T> {
	readonly value: T;
	readonly expiresAt: number;
}

/** Default TTL is 10 minutes in milliseconds. */
export const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

/** Maximum cached items before least recently used eviction occurs. */
export const DEFAULT_MAX_CACHE_SIZE = 500;

/**
 * Coordinate rounding helper for geographic cache keys.
 * Rounds to 2 decimal places (approx. 1.1 km at the equator).
 *
 * @param coord Latitude or longitude float.
 */
export function roundCoordinate(coord: number): number {
	return Math.round(coord * 100) / 100;
}

/**
 * Generate a deterministic cache key from latitude and longitude.
 */
export function formatGeoCacheKey(prefix: string, lat: number, lon: number): string {
	const rLat = roundCoordinate(lat).toFixed(2);
	const rLon = roundCoordinate(lon).toFixed(2);
	return `${prefix}:${rLat},${rLon}`;
}

export class BoundedLruCache<T> {
	private readonly capacity: number;
	private readonly ttlMs: number;
	private readonly store: Map<string, CacheEntry<T>>;
	private readonly inFlight: Map<string, Promise<T>>;

	constructor(capacity = DEFAULT_MAX_CACHE_SIZE, ttlMs = DEFAULT_CACHE_TTL_MS) {
		this.capacity = capacity;
		this.ttlMs = ttlMs;
		this.store = new Map();
		this.inFlight = new Map();
	}

	/**
	 * Get an entry if present and not expired. Updates LRU access ordering.
	 */
	get(key: string): T | null {
		const entry = this.store.get(key);
		if (entry === undefined) {
			return null;
		}

		if (Date.now() > entry.expiresAt) {
			this.store.delete(key);
			return null;
		}

		// Re-insert to mark as most recently used
		this.store.delete(key);
		this.store.set(key, entry);
		return entry.value;
	}

	/**
	 * Set a value in the cache with the configured TTL.
	 */
	set(key: string, value: T, ttlMs = this.ttlMs): void {
		if (this.store.has(key)) {
			this.store.delete(key);
		} else if (this.store.size >= this.capacity) {
			// Evict oldest (first item in Map iterator)
			const oldestKey = this.store.keys().next().value;
			if (oldestKey !== undefined) {
				this.store.delete(oldestKey);
			}
		}

		this.store.set(key, {
			value,
			expiresAt: Date.now() + ttlMs,
		});
	}

	/**
	 * Fetch or compute a value with automatic concurrent request deduplication.
	 *
	 * If multiple asynchronous requests arrive concurrently for the same un-cached key,
	 * only a single fetcher execution is launched, and all callers await the same promise.
	 */
	async getOrFetch(key: string, fetcher: () => Promise<T>, ttlMs = this.ttlMs): Promise<T> {
		const cached = this.get(key);
		if (cached !== null) {
			return cached;
		}

		const existingPromise = this.inFlight.get(key);
		if (existingPromise !== undefined) {
			return existingPromise;
		}

		const promise = (async (): Promise<T> => {
			try {
				const value = await fetcher();
				this.set(key, value, ttlMs);
				return value;
			} finally {
				this.inFlight.delete(key);
			}
		})();

		this.inFlight.set(key, promise);
		return promise;
	}

	/** Number of active entries in cache. */
	get size(): number {
		return this.store.size;
	}

	/** Number of currently deduplicated in-flight operations. */
	get inFlightCount(): number {
		return this.inFlight.size;
	}

	/** Clear all cache entries and in-flight tracking. */
	clear(): void {
		this.store.clear();
		this.inFlight.clear();
	}
}

/** Global shared instance for air quality response caching. */
export const airQualityCache = new BoundedLruCache<unknown>(500, DEFAULT_CACHE_TTL_MS);

/** Global shared instance for geocoding query caching. */
export const geocodingCache = new BoundedLruCache<unknown>(200, 60 * 60 * 1000); // 1 hour for city names
