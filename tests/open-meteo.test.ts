/**
 * Unit tests for Open-Meteo Geocoding and Air Quality API Client.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UpstreamServiceError } from "@/lib/api";
import { airQualityCache, geocodingCache } from "@/lib/cache";
import { fetchLiveAirData, searchLocations } from "@/lib/open-meteo";

describe("Open-Meteo Client Operations", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		geocodingCache.clear();
		airQualityCache.clear();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		geocodingCache.clear();
		airQualityCache.clear();
	});

	describe("searchLocations", () => {
		it("searches and maps location results", async () => {
			const mockGeocodeData = {
				results: [
					{
						id: 1273294,
						name: "Delhi",
						country: "India",
						admin1: "National Capital Territory",
						latitude: 28.65195,
						longitude: 77.23149,
						timezone: "Asia/Kolkata",
					},
				],
			};

			globalThis.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockGeocodeData),
			});

			const results = await searchLocations("Delhi");
			expect(results.length).toBe(1);
			expect(results[0]?.name).toBe("Delhi");
			expect(results[0]?.country).toBe("India");
			expect(results[0]?.admin1).toBe("National Capital Territory");
		});

		it("returns cached results on repeated searches without extra network call", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve({
						results: [
							{
								id: 2643743,
								name: "London",
								country: "United Kingdom",
								latitude: 51.50853,
								longitude: -0.12574,
							},
						],
					}),
			});
			globalThis.fetch = mockFetch;

			const first = await searchLocations("London");
			const second = await searchLocations("London");

			expect(first).toEqual(second);
			expect(mockFetch).toHaveBeenCalledTimes(1);
		});

		it("returns empty array when upstream returns non-ok status or empty results", async () => {
			globalThis.fetch = vi.fn().mockResolvedValueOnce({
				ok: false,
				status: 500,
			});

			const results = await searchLocations("FailCity");
			expect(results).toEqual([]);
		});
	});

	describe("fetchLiveAirData", () => {
		it("fetches, parses, and calculates current pollutants and hourly forecast", async () => {
			const mockAirData = {
				current: {
					us_aqi: 185,
					pm2_5: 112.5,
					pm10: 175.0,
					nitrogen_dioxide: 48.0,
					ozone: 32.0,
					carbon_monoxide: 550,
				},
				hourly: {
					time: ["2026-11-22T10:00:00Z", "2026-11-22T11:00:00Z"],
					us_aqi: [180, 190],
					pm2_5: [105.0, 120.0],
					pm10: [160.0, 190.0],
					nitrogen_dioxide: [40, 55],
					ozone: [30, 35],
					carbon_monoxide: [500, 600],
				},
			};

			globalThis.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockAirData),
			});

			const { pollutants, hourly } = await fetchLiveAirData(28.6139, 77.209);
			expect(pollutants.usAqi).toBe(185);
			expect(pollutants.pm25).toBe(112.5);
			expect(pollutants.no2).toBe(48.0);
			expect(hourly.length).toBe(2);
			expect(hourly[0]?.hourLabel).toBeDefined();
		});

		it("throws an error when upstream air quality API returns an error response", async () => {
			globalThis.fetch = vi.fn().mockResolvedValueOnce({
				ok: false,
				status: 503,
			});

			await expect(fetchLiveAirData(0, 0)).rejects.toBeInstanceOf(UpstreamServiceError);
		});
	});
});
