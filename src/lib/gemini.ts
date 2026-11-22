/**
 * Backward-compatible Gemini facade. New application code uses `src/lib/ai/`.
 */

import { GeminiUnavailableError } from "@/lib/api";
import { DEFAULT_TIMEOUT_MS, MAX_OUTPUT_TOKENS } from "@/lib/ai/config";
import {
	DEFAULT_GEMINI_MODEL_CHAIN,
	geminiProvider,
	getGeminiModelChain,
	isGeminiConfigured,
	resetGeminiClient as resetProviderClient,
} from "@/lib/ai/gemini";

/** Verified Gemini models retained for compatibility with existing callers. */
export const DEFAULT_MODEL_CHAIN = DEFAULT_GEMINI_MODEL_CHAIN;

/** The first model in the default Gemini chain. */
export const DEFAULT_MODEL_NAME = DEFAULT_MODEL_CHAIN[0];

/** Per-model Gemini timeout retained for compatibility with existing callers. */
export { DEFAULT_TIMEOUT_MS, MAX_OUTPUT_TOKENS };

/**
 * Check whether a valid Gemini API key is configured.
 */
export { isGeminiConfigured };

/**
 * Build the ordered Gemini model chain. A configured model is tried first.
 */
export function getModelChain(): readonly string[] {
	return getGeminiModelChain();
}

/**
 * Retrieve the first Gemini model that would be attempted.
 */
export function getModelName(): string {
	return getModelChain()[0] ?? DEFAULT_MODEL_NAME;
}

/**
 * Generate text through Gemini's provider-only chain for legacy callers.
 *
 * @param prompt The complete user content payload.
 * @param systemInstruction System instruction string establishing grounding boundaries.
 * @returns Generated plain text string.
 * @throws {GeminiUnavailableError} When no key is present or every model attempt fails.
 */
export async function generateText(
	prompt: string,
	systemInstruction?: string,
): Promise<string> {
	try {
		return (
			await geminiProvider.generate({
				prompt,
				...(systemInstruction !== undefined ? { systemInstruction } : {}),
			})
		).text;
	} catch (error) {
		throw new GeminiUnavailableError(
			error instanceof Error ? error.message : "Gemini service unavailable",
		);
	}
}

/**
 * Reset the cached Gemini client for isolated tests.
 */
export function resetGeminiClient(): void {
	resetProviderClient();
}
