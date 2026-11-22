/**
 * Groq OpenAI-compatible text provider implementation.
 */

import { z } from "zod";
import { buildModelChain, DEFAULT_TIMEOUT_MS, MAX_OUTPUT_TOKENS, readConfiguredEnv } from "@/lib/ai/config";
import { runModelChain, withAbortTimeout } from "@/lib/ai/model-chain";
import type { TextGenerationRequest, TextProvider } from "@/lib/ai/types";

/**
 * Groq's OpenAI-compatible chat-completions endpoint.
 */
export const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Verified Groq fallback models used when GROQ_MODEL is unset or unavailable.
 */
export const DEFAULT_GROQ_MODEL_CHAIN = [
	"openai/gpt-oss-120b",
	"qwen/qwen3.8-27b",
] as const;

const groqResponseSchema = z.object({
	choices: z.array(
		z.object({
			message: z.object({ content: z.string() }),
		}),
	).min(1),
});

/**
 * Check whether a valid Groq API key is configured.
 */
export function isGroqConfigured(): boolean {
	return readConfiguredEnv("GROQ_API_KEY") !== undefined;
}

/**
 * Return the ordered Groq model chain with GROQ_MODEL first.
 */
export function getGroqModelChain(): readonly string[] {
	return buildModelChain(readConfiguredEnv("GROQ_MODEL"), DEFAULT_GROQ_MODEL_CHAIN);
}

/**
 * Execute one Groq model request with schema validation, the shared system prompt,
 * and the same output cap used by Gemini.
 */
async function generateWithModel(
	apiKey: string,
	model: string,
	request: TextGenerationRequest,
): Promise<string> {
	const response = await withAbortTimeout(
		DEFAULT_TIMEOUT_MS,
		(signal) =>
			fetch(GROQ_CHAT_COMPLETIONS_URL, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model,
					messages: [
						...(request.systemInstruction !== undefined
							? [{ role: "system", content: request.systemInstruction }]
							: []),
						{ role: "user", content: request.prompt },
					],
					max_tokens: MAX_OUTPUT_TOKENS,
				}),
				signal,
			}),
		"Groq API request timed out",
	);

	if (!response.ok) {
		throw new Error(`Groq request failed with HTTP ${String(response.status)}.`);
	}

	const parsed = groqResponseSchema.parse((await response.json()) as unknown);
	const text = parsed.choices[0]?.message.content.trim() ?? "";
	if (text.length === 0) {
		throw new Error("Groq returned an empty response.");
	}
	return text;
}

/**
 * Server-side Groq provider used only after the Gemini provider fails.
 */
export const groqProvider: TextProvider = {
	name: "groq",
	isConfigured: isGroqConfigured,
	async generate(request) {
		const apiKey = readConfiguredEnv("GROQ_API_KEY");
		if (apiKey === undefined) {
			throw new Error("Groq is not configured.");
		}

		return runModelChain(
			getGroqModelChain(),
			(model) => generateWithModel(apiKey, model, request),
		);
	},
};
