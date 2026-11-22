/**
 * Unit tests for In-Memory Sliding Window Rate Limiting.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimitExceededError } from "@/lib/api";
import {
	enforceRateLimit,
	extractClientIp,
	RATE_LIMITS,
	resetRateLimits,
} from "@/lib/rate-limit";

describe("extractClientIp", () => {
	it("extracts the first IP from comma-separated x-forwarded-for header", () => {
		const req = new Request("http://localhost", {
			headers: { "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178" },
		});
		expect(extractClientIp(req)).toBe("203.0.113.195");
	});

	it("extracts IP from single x-forwarded-for header", () => {
		const req = new Request("http://localhost", {
			headers: { "x-forwarded-for": "198.51.100.1" },
		});
		expect(extractClientIp(req)).toBe("198.51.100.1");
	});

	it("falls back to x-real-ip if x-forwarded-for is missing", () => {
		const req = new Request("http://localhost", {
			headers: { "x-real-ip": "192.0.2.1" },
		});
		expect(extractClientIp(req)).toBe("192.0.2.1");
	});

	it("falls back to localhost 127.0.0.1 when no forwarding headers are set", () => {
		const req = new Request("http://localhost");
		expect(extractClientIp(req)).toBe("127.0.0.1");
	});
});

describe("enforceRateLimit Sliding Window", () => {
	beforeEach(() => {
		resetRateLimits();
	});

	it("allows requests below the category threshold", () => {
		const ip = "10.0.0.1";
		expect(() => {
			for (let i = 0; i < 5; i++) {
				enforceRateLimit(ip, "geocode");
			}
		}).not.toThrow();
	});

	it("throws RateLimitExceededError when maxRequests is reached", () => {
		const ip = "10.0.0.2";
		const max = RATE_LIMITS["briefing"]?.maxRequests ?? 20;

		for (let i = 0; i < max; i++) {
			enforceRateLimit(ip, "briefing");
		}

		expect(() => {
			enforceRateLimit(ip, "briefing");
		}).toThrow(RateLimitExceededError);
	});

	it("sets correct retryAfterSeconds on RateLimitExceededError", () => {
		const ip = "10.0.0.3";
		const max = RATE_LIMITS["chat"]?.maxRequests ?? 30;

		for (let i = 0; i < max; i++) {
			enforceRateLimit(ip, "chat");
		}

		try {
			enforceRateLimit(ip, "chat");
			expect.unreachable("Should have thrown RateLimitExceededError");
		} catch (err) {
			expect(err).toBeInstanceOf(RateLimitExceededError);
			const rateErr = err as RateLimitExceededError;
			expect(rateErr.retryAfterSeconds).toBeGreaterThan(0);
			expect(rateErr.retryAfterSeconds).toBeLessThanOrEqual(60);
		}
	});

	it("tracks IPs independently without cross-interference", () => {
		const ipA = "10.0.0.4";
		const ipB = "10.0.0.5";
		const max = RATE_LIMITS["briefing"]?.maxRequests ?? 20;

		for (let i = 0; i < max; i++) {
			enforceRateLimit(ipA, "briefing");
		}

		// ipA is blocked
		expect(() => {
			enforceRateLimit(ipA, "briefing");
		}).toThrow(RateLimitExceededError);

		// ipB is completely unaffected
		expect(() => {
			enforceRateLimit(ipB, "briefing");
		}).not.toThrow();
	});

	it("allows new requests after sliding window passes", () => {
		const ip = "10.0.0.6";
		const max = RATE_LIMITS["geocode"]?.maxRequests ?? 30;

		for (let i = 0; i < max; i++) {
			enforceRateLimit(ip, "geocode");
		}

		expect(() => {
			enforceRateLimit(ip, "geocode");
		}).toThrow(RateLimitExceededError);

		// Advance clock by 61 seconds
		vi.setSystemTime(Date.now() + 61_000);

		expect(() => {
			enforceRateLimit(ip, "geocode");
		}).not.toThrow();

		vi.useRealTimers();
	});
});
