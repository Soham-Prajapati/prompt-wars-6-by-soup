/**
 * GET /api/air-data
 *
 * Retrieve live current pollutant readings and 48-hour hourly forecast.
 */

import { handle, jsonOk } from "@/lib/api";
import { fetchLiveAirData } from "@/lib/open-meteo";
import { enforceRateLimit, extractClientIp } from "@/lib/rate-limit";
import { airQualityQuerySchema } from "@/lib/validation";

/** Validate coordinates and return cached, validated air-quality data. */
export async function GET(request: Request): Promise<Response> {
	return handle(async () => {
		const ip = extractClientIp(request);
		enforceRateLimit(ip, "air");

		const { searchParams } = new URL(request.url);
		const rawLat = searchParams.get("lat");
		const rawLon = searchParams.get("lon");

		const { lat, lon } = airQualityQuerySchema.parse({
			lat: rawLat,
			lon: rawLon,
		});

		const airData = await fetchLiveAirData(lat, lon);
		return jsonOk(airData);
	});
}
