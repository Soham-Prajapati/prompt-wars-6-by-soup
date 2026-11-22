/**
 * POST /api/chat
 *
 * Grounded conversational Q&A assistant for the family. Answers questions strictly
 * based on the structured CleanAirPlan. If the ordered Gemini/Groq provider chain is
 * not configured or fails, delivers deterministic answers derived from the plan.
 */

import { z } from "zod";
import { handle, jsonOk, readJsonBody } from "@/lib/api";
import { generateDeterministicChatResponse } from "@/lib/fallback";
import { generateText } from "@/lib/ai/orchestrator";
import { buildChatPrompt, SYSTEM_GROUNDING_INSTRUCTION } from "@/lib/prompt";
import { enforceRateLimit, extractClientIp } from "@/lib/rate-limit";
import {
	chatMessageSchema,
	cleanAirPlanSchema,
	householdProfileSchema,
	supportedLanguageSchema,
} from "@/lib/validation";

const chatEndpointSchema = z.object({
	question: z.string().trim().min(1).max(400),
	profile: householdProfileSchema,
	plan: cleanAirPlanSchema,
	language: supportedLanguageSchema.default("en"),
	history: z.array(chatMessageSchema).max(10).optional().default([]),
});

/** Answer a validated follow-up question using only computed plan facts. */
export async function POST(request: Request): Promise<Response> {
	return handle(async () => {
		const ip = extractClientIp(request);
		enforceRateLimit(ip, "chat");

		const raw = await readJsonBody(request);
		const { question, profile, plan, language, history } = chatEndpointSchema.parse(raw);

		try {
			const prompt = buildChatPrompt(profile, plan, question, language, history);
			const generated = await generateText({
				prompt,
				systemInstruction: SYSTEM_GROUNDING_INSTRUCTION,
			});

			if (generated.length === 0) {
				throw new Error("Empty model response");
			}

			return jsonOk({
				answer: generated,
				source: "ai",
			});
		} catch {
			const reply = generateDeterministicChatResponse(question, plan, profile);
			return jsonOk({
				answer: reply,
				source: "fallback",
			});
		}
	});
}
