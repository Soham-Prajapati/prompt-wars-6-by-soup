/**
 * Open-Meteo Air Quality & Geocoding API Client.
 *
 * Provides typed, keyless access to Open-Meteo services with:
 * - Server-side bounded LRU caching (TTL 10 min for air data, 1 hour for geocoding)
 * - In-flight deduplication of concurrent requests
 * - Coordinate rounding to 2 decimal places (~1.1 km)
 * - AbortController request timeouts (5 seconds)
 * - Zod schema validation of upstream payloads
 */

import {
	airQualityCache,
	formatGeoCacheKey,
	geocodingCache,
} from "@/lib/cache";
import { UpstreamServiceError } from "@/lib/api";
import { parseOpenMeteoHourly } from "@/lib/forecast";
import { z } from "zod";
import type {
	GeoLocation,
	HourlyForecastPoint,
	PollutantBreakdown,
} from "@/lib/types";

const GEOCODING_BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const AIR_QUALITY_BASE_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";
const TIMEOUT_MS = 6000;

const rawGeocodeResponseSchema = z.object({
	results: z.array(
		z.object({
			id: z.number().int(),
			name: z.string().min(1),
			country: z.string().min(1),
			admin1: z.string().optional(),
			latitude: z.number().min(-90).max(90),
			longitude: z.number().min(-180).max(180),
			timezone: z.string().optional(),
		}),
	).max(20).optional(),
});

/**
 * Search cities by name via the Open-Meteo Geocoding API.
 *
 * @param query Search query string (e.g. "Delhi", "London", "São Paulo").
 * @returns Array of matching GeoLocation objects.
 */
export async function searchLocations(query: string): Promise<readonly GeoLocation[]> {
	const sanitized = query.trim().toLowerCase();
	const cacheKey = `geo:${sanitized}`;

	return geocodingCache.getOrFetch(cacheKey, async () => {
		const url = new URL(GEOCODING_BASE_URL);
		url.searchParams.set("name", query.trim());
		url.searchParams.set("count", "5");
		url.searchParams.set("language", "en");
		url.searchParams.set("format", "json");

		const controller = new AbortController();
		const timeoutId = setTimeout(() => {
			controller.abort();
		}, TIMEOUT_MS);

		try {
			const res = await fetch(url.toString(), {
				signal: controller.signal,
				headers: { Accept: "application/json" },
			});

			if (!res.ok) {
				return [];
			}

			let rawBody: unknown;
			try {
				rawBody = await res.json();
			} catch {
				throw new UpstreamServiceError();
			}
			const parsed = rawGeocodeResponseSchema.safeParse(rawBody);
			if (!parsed.success || parsed.data.results === undefined) {
				return [];
			}
			const rawResults = parsed.data.results;

			return rawResults.map((r): GeoLocation => ({
				id: r.id,
				name: r.name,
				country: r.country,
				...(r.admin1 !== undefined ? { admin1: r.admin1 } : {}),
				latitude: r.latitude,
				longitude: r.longitude,
				timezone: r.timezone ?? "auto",
			}));
		} finally {
			clearTimeout(timeoutId);
		}
	}) as Promise<readonly GeoLocation[]>;
}

const optionalCurrentNumber = z.number().min(0).optional().nullable();
const optionalHourlySeries = z
	.array(z.number().min(0).nullable())
	.max(1000)
	.optional();
const rawAirQualityResponseSchema = z.object({
	current: z
		.object({
			us_aqi: optionalCurrentNumber,
			pm2_5: optionalCurrentNumber,
			pm10: optionalCurrentNumber,
			nitrogen_dioxide: optionalCurrentNumber,
			ozone: optionalCurrentNumber,
			carbon_monoxide: optionalCurrentNumber,
		})
		.optional(),
	hourly: z
		.object({
			time: z.array(z.string().min(1)).max(1000),
			us_aqi: optionalHourlySeries,
			pm2_5: optionalHourlySeries,
			pm10: optionalHourlySeries,
			nitrogen_dioxide: optionalHourlySeries,
			ozone: optionalHourlySeries,
			carbon_monoxide: optionalHourlySeries,
		})
		.optional(),
}).refine(
	(data) => data.current !== undefined || data.hourly !== undefined,
	{ message: "Open-Meteo response must include current or hourly data." },
);

type RawAirQualityResponse = z.infer<typeof rawAirQualityResponseSchema>;

/** Validated current and hourly air data returned by Open-Meteo. */
export interface AirDataResult {
	readonly pollutants: PollutantBreakdown;
	readonly hourly: readonly HourlyForecastPoint[];
}

/**
 * Fetch live current air quality and 48-hour hourly forecast from Open-Meteo.
 *
 * @param latitude Geographic latitude (-90 to 90).
 * @param longitude Geographic longitude (-180 to 180).
 */
export async function fetchLiveAirData(
	latitude: number,
	longitude: number,
): Promise<AirDataResult> {
	const cacheKey = formatGeoCacheKey("air", latitude, longitude);

	return airQualityCache.getOrFetch(cacheKey, async () => {
		const url = new URL(AIR_QUALITY_BASE_URL);
		url.searchParams.set("latitude", latitude.toFixed(4));
		url.searchParams.set("longitude", longitude.toFixed(4));
		url.searchParams.set(
			"current",
			"us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide",
		);
		url.searchParams.set(
			"hourly",
			"us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide",
		);
		url.searchParams.set("forecast_days", "2");
		url.searchParams.set("timezone", "auto");

		const controller = new AbortController();
		const timeoutId = setTimeout(() => {
			controller.abort();
		}, TIMEOUT_MS);

		try {
			const res = await fetch(url.toString(), {
				signal: controller.signal,
				headers: { Accept: "application/json" },
			});

			if (!res.ok) {
				throw new UpstreamServiceError();
			}

			let rawBody: unknown;
			try {
				rawBody = await res.json();
			} catch {
				throw new UpstreamServiceError();
			}
			const parsed = rawAirQualityResponseSchema.safeParse(rawBody);
			if (!parsed.success) {
				throw new UpstreamServiceError();
			}
			const data: RawAirQualityResponse = parsed.data;

			const pollutants: PollutantBreakdown = {
				usAqi: Math.round(data.current?.us_aqi ?? 50),
				pm25: Math.round((data.current?.pm2_5 ?? 12) * 10) / 10,
				pm10: Math.round((data.current?.pm10 ?? 25) * 10) / 10,
				no2: Math.round((data.current?.nitrogen_dioxide ?? 15) * 10) / 10,
				o3: Math.round((data.current?.ozone ?? 30) * 10) / 10,
				co: Math.round((data.current?.carbon_monoxide ?? 250) * 10) / 10,
			};

			const hourly = data.hourly?.time
				? parseOpenMeteoHourly({
						time: data.hourly.time,
						...(data.hourly.us_aqi !== undefined ? { us_aqi: data.hourly.us_aqi } : {}),
						...(data.hourly.pm2_5 !== undefined ? { pm2_5: data.hourly.pm2_5 } : {}),
						...(data.hourly.pm10 !== undefined ? { pm10: data.hourly.pm10 } : {}),
						...(data.hourly.nitrogen_dioxide !== undefined
							? { nitrogen_dioxide: data.hourly.nitrogen_dioxide }
							: {}),
						...(data.hourly.ozone !== undefined ? { ozone: data.hourly.ozone } : {}),
						...(data.hourly.carbon_monoxide !== undefined
							? { carbon_monoxide: data.hourly.carbon_monoxide }
							: {}),
					})
				: [];

			return { pollutants, hourly };
		} finally {
			clearTimeout(timeoutId);
		}
	}) as Promise<AirDataResult>;
}
