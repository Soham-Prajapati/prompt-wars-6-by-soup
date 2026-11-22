/**
 * POST /api/plan
 *
 * Compute a complete, tailored CleanAirPlan from location coordinates and household profile.
 */

import { z } from "zod";
import { handle, jsonOk, readJsonBody } from "@/lib/api";
import { buildCleanAirPlan } from "@/lib/decision-engine";
import { fetchLiveAirData } from "@/lib/open-meteo";
import { enforceRateLimit, extractClientIp } from "@/lib/rate-limit";
import { geoLocationSchema, householdProfileSchema } from "@/lib/validation";

const planRequestBodySchema = z.object({
	location: geoLocationSchema,
	profile: householdProfileSchema,
});

/** Validate a location/profile pair and compute the deterministic daily plan. */
export async function POST(request: Request): Promise<Response> {
	return handle(async () => {
		const ip = extractClientIp(request);
		enforceRateLimit(ip, "air");

		const raw = await readJsonBody(request);
		const { location, profile } = planRequestBodySchema.parse(raw);

		const { pollutants, hourly } = await fetchLiveAirData(
			location.latitude,
			location.longitude,
		);

		const plan = buildCleanAirPlan(location, profile, pollutants, hourly);
		return jsonOk({ plan });
	});
}
