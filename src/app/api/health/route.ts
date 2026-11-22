/**
 * GET /api/health
 *
 * Operational health check and service discovery endpoint.
 * Reports system uptime, timestamp, active environment status, and whether
 * the generative AI layer has a configured API key.
 */

import { handle, jsonOk } from "@/lib/api";
import { isGeminiConfigured } from "@/lib/gemini";
import { enforceRateLimit, extractClientIp } from "@/lib/rate-limit";

/** Return a bounded, non-sensitive service health summary. */
export function GET(request: Request): Promise<Response> {
	return handle(() => {
		enforceRateLimit(extractClientIp(request), "health");
		return Promise.resolve(
			jsonOk({
				status: "ok",
				product: "ClearAir",
				aiConfigured: isGeminiConfigured(),
				timestamp: new Date().toISOString(),
				version: "1.0.0",
			}),
		);
	});
}
