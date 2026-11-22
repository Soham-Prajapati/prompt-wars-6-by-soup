/**
 * POST /api/briefing
 *
 * Generate a personalized, plain-language family briefing narrating the computed plan.
 * Uses Google Gemini when GEMINI_API_KEY is configured, with automatic fallback
 * to the deterministic multilingual template briefing if unconfigured or unreachable.
 */

import { handle, jsonOk, readJsonBody } from "@/lib/api";
import { generateDeterministicBriefing } from "@/lib/fallback";
import { generateText, isGeminiConfigured } from "@/lib/gemini";
import {
	buildBriefingPrompt,
	SYSTEM_GROUNDING_INSTRUCTION,
} from "@/lib/prompt";
import { enforceRateLimit, extractClientIp } from "@/lib/rate-limit";
import {
	cleanAirPlanSchema,
	householdProfileSchema,
	supportedLanguageSchema,
} from "@/lib/validation";
import { z } from "zod";

const briefingSchema = z.object({
	profile: householdProfileSchema,
	plan: cleanAirPlanSchema,
	language: supportedLanguageSchema.default("en"),
});

/** Narrate a validated plan with Gemini or the deterministic fallback. */
export async function POST(request: Request): Promise<Response> {
	return handle(async () => {
		const ip = extractClientIp(request);
		enforceRateLimit(ip, "briefing");

		const raw = await readJsonBody(request);
		const { profile, plan, language } = briefingSchema.parse(raw);

		// If Gemini is not configured, directly return deterministic briefing
		if (!isGeminiConfigured()) {
			const fallbackText = generateDeterministicBriefing(plan, language);
			return jsonOk({
				briefing: fallbackText,
				source: "fallback",
			});
		}

		try {
			const prompt = buildBriefingPrompt(profile, plan, language);
			const generated = await generateText(prompt, SYSTEM_GROUNDING_INSTRUCTION);

			if (generated.length === 0) {
				throw new Error("Empty model output");
			}

			return jsonOk({
				briefing: generated,
				source: "ai",
			});
		} catch {
			// Transparent degradation: fallback ensures full product usability
			const fallbackText = generateDeterministicBriefing(plan, language);
			return jsonOk({
				briefing: fallbackText,
				source: "fallback",
			});
		}
	});
}
