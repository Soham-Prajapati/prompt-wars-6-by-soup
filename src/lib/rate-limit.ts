/**
 * In-memory sliding window rate limiter.
 *
 * Enforces per-IP request bounds across API endpoints to prevent upstream abuse,
 * denial-of-service, and runaway token consumption.
 */

import { RateLimitExceededError } from "@/lib/api";

interface RateLimitConfig {
	readonly windowMs: number;
	readonly maxRequests: number;
}

/** Rate limits configured per operational category. */
export const RATE_LIMITS: Readonly<Record<string, RateLimitConfig>> = {
	geocode: { windowMs: 60_000, maxRequests: 30 },
	air: { windowMs: 60_000, maxRequests: 60 },
	briefing: { windowMs: 60_000, maxRequests: 20 },
	chat: { windowMs: 60_000, maxRequests: 30 },
	health: { windowMs: 60_000, maxRequests: 60 },
};

interface RateRecord {
	timestamps: number[];
}

/** Global in-memory storage of IP request timestamps. */
const rateMap = new Map<string, RateRecord>();

/**
 * Extract client IP address from standard forwarding headers or fallback.
 *
 * @param request Next.js or standard Web Request.
 */
export function extractClientIp(request: Request): string {
	const xff = request.headers.get("x-forwarded-for");
	if (xff !== null && xff.length > 0) {
		const first = xff.split(",")[0];
		if (first !== undefined && first.trim().length > 0) {
			return first.trim();
		}
	}

	const realIp = request.headers.get("x-real-ip");
	if (realIp !== null && realIp.length > 0) {
		return realIp.trim();
	}

	return "127.0.0.1";
}

/**
 * Check and record a rate limit increment.
 *
 * @param ip Client IP address.
 * @param category Rate limit category.
 * @throws {RateLimitExceededError} If request count exceeds allowed threshold.
 */
export function enforceRateLimit(ip: string, category: keyof typeof RATE_LIMITS): void {
	const config = RATE_LIMITS[category] ?? { windowMs: 60_000, maxRequests: 30 };
	const now = Date.now();
	const windowStart = now - config.windowMs;
	const key = `${category}:${ip}`;

	let record = rateMap.get(key);
	if (!record) {
		record = { timestamps: [] };
		rateMap.set(key, record);
	}

	// Filter timestamps strictly inside the current sliding window
	record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

	if (record.timestamps.length >= config.maxRequests) {
		const oldest = record.timestamps[0] ?? windowStart;
		const retryAfterSeconds = Math.max(1, Math.ceil((oldest + config.windowMs - now) / 1000));
		throw new RateLimitExceededError(
			retryAfterSeconds,
			`Rate limit exceeded for ${category}. Please retry after ${String(retryAfterSeconds)} seconds.`,
		);
	}

	record.timestamps.push(now);
}

/**
 * Clear the in-memory rate map (used for test isolation).
 */
export function resetRateLimits(): void {
	rateMap.clear();
}
