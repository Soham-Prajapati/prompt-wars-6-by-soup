/**
 * Unit tests for Bounded LRU Cache, TTL Expiration, and Concurrent In-Flight Deduplication.
 */

import { describe, expect, it, vi } from "vitest";
import {
	BoundedLruCache,
	formatGeoCacheKey,
	roundCoordinate,
} from "@/lib/cache";

describe("Coordinate Rounding and Key Formatting", () => {
	it("rounds floating coordinates to 2 decimal places (~1.1 km)", () => {
		expect(roundCoordinate(28.613928)).toBe(28.61);
		expect(roundCoordinate(77.209021)).toBe(77.21);
		expect(roundCoordinate(-34.603722)).toBe(-34.6);
	});

	it("formats deterministic cache keys", () => {
		const key = formatGeoCacheKey("air", 28.6139, 77.209);
		expect(key).toBe("air:28.61,77.21");
	});

	it("maps nearby coordinates within 1 km to the exact same cache key", () => {
		const key1 = formatGeoCacheKey("air", 28.61391, 77.20901);
		const key2 = formatGeoCacheKey("air", 28.61402, 77.20912);
		expect(key1).toBe(key2);
	});
});

describe("BoundedLruCache Core Operations", () => {
	it("stores and retrieves values", () => {
		const cache = new BoundedLruCache<string>(10, 60_000);
		cache.set("key1", "val1");
		expect(cache.get("key1")).toBe("val1");
		expect(cache.size).toBe(1);
	});

	it("returns null for non-existent keys", () => {
		const cache = new BoundedLruCache<number>(10, 60_000);
		expect(cache.get("missing")).toBeNull();
	});

	it("evicts oldest least-recently-used item when capacity is exceeded", () => {
		const cache = new BoundedLruCache<string>(3, 60_000);
		cache.set("k1", "v1");
		cache.set("k2", "v2");
		cache.set("k3", "v3");

		// Access k1 to make it recently used (k2 becomes oldest)
		cache.get("k1");

		// Insert k4, should evict k2
		cache.set("k4", "v4");

		expect(cache.get("k2")).toBeNull();
		expect(cache.get("k1")).toBe("v1");
		expect(cache.get("k3")).toBe("v3");
		expect(cache.get("k4")).toBe("v4");
		expect(cache.size).toBe(3);
	});

	it("expires entries after TTL elapsed", () => {
		const cache = new BoundedLruCache<string>(10, 50); // 50ms TTL
		cache.set("k1", "v1");

		expect(cache.get("k1")).toBe("v1");

		// Fast forward clock
		vi.setSystemTime(Date.now() + 100);
		expect(cache.get("k1")).toBeNull();
		vi.useRealTimers();
	});

	it("clears all entries and in-flight tracking", () => {
		const cache = new BoundedLruCache<string>(10, 60_000);
		cache.set("k1", "v1");
		cache.set("k2", "v2");
		cache.clear();
		expect(cache.size).toBe(0);
		expect(cache.get("k1")).toBeNull();
	});
});

describe("BoundedLruCache Concurrent In-Flight Deduplication", () => {
	it("executes fetcher exactly once for concurrent identical calls", async () => {
		const cache = new BoundedLruCache<number>(10, 60_000);
		const mockFetcher = vi.fn().mockImplementation(async () => {
			await new Promise((resolve) => setTimeout(resolve, 30));
			return 42;
		});

		// Launch 5 concurrent fetches for the same key
		const promises = [
			cache.getOrFetch("sharedKey", mockFetcher),
			cache.getOrFetch("sharedKey", mockFetcher),
			cache.getOrFetch("sharedKey", mockFetcher),
			cache.getOrFetch("sharedKey", mockFetcher),
			cache.getOrFetch("sharedKey", mockFetcher),
		];

		const results = await Promise.all(promises);

		expect(results).toEqual([42, 42, 42, 42, 42]);
		expect(mockFetcher).toHaveBeenCalledTimes(1);
		expect(cache.inFlightCount).toBe(0);
		expect(cache.get("sharedKey")).toBe(42);
	});

	it("serves subsequent calls directly from cache without invoking fetcher again", async () => {
		const cache = new BoundedLruCache<string>(10, 60_000);
		const mockFetcher = vi.fn().mockResolvedValue("hello");

		const val1 = await cache.getOrFetch("k", mockFetcher);
		const val2 = await cache.getOrFetch("k", mockFetcher);

		expect(val1).toBe("hello");
		expect(val2).toBe("hello");
		expect(mockFetcher).toHaveBeenCalledTimes(1);
	});

	it("cleans up inFlight map even if fetcher throws an error", async () => {
		const cache = new BoundedLruCache<string>(10, 60_000);
		const failingFetcher = vi.fn().mockRejectedValue(new Error("Network failed"));

		await expect(cache.getOrFetch("errKey", failingFetcher)).rejects.toThrow("Network failed");
		expect(cache.inFlightCount).toBe(0);
		expect(cache.get("errKey")).toBeNull();
	});
});
