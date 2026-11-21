/**
 * GET /api/locations
 *
 * Search cities and urban agglomerations using Open-Meteo Geocoding.
 */

import { handle, jsonOk } from "@/lib/api";
import { searchLocations } from "@/lib/open-meteo";
import { enforceRateLimit, extractClientIp } from "@/lib/rate-limit";
import { geocodeQuerySchema } from "@/lib/validation";

export async function GET(request: Request): Promise<Response> {
	return handle(async () => {
		const ip = extractClientIp(request);
		enforceRateLimit(ip, "geocode");

		const { searchParams } = new URL(request.url);
		const rawQuery = searchParams.get("q") ?? "";
		const { q } = geocodeQuerySchema.parse({ q: rawQuery });

		const locations = await searchLocations(q);
		return jsonOk({ locations });
	});
}
