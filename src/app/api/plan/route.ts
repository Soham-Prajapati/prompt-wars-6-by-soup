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
import { householdProfileSchema } from "@/lib/validation";

const planRequestBodySchema = z.object({
	location: z.object({
		id: z.number(),
		name: z.string().min(1),
		country: z.string().min(1),
		admin1: z.string().optional(),
		latitude: z.number().min(-90).max(90),
		longitude: z.number().min(-180).max(180),
		timezone: z.string().default("auto"),
	}),
	profile: householdProfileSchema,
});

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
