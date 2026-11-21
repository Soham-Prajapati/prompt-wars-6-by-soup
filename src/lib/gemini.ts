/**
 * Google Gemini Generative AI Client.
 *
 * Uses the official `@google/genai` SDK (`GoogleGenAI`) to generate plain-language
 * family briefings and follow-up conversational answers strictly grounded in the
 * computed air quality decision engine facts.
 *
 * Security and reliability features:
 * - API key read strictly from server-side `GEMINI_API_KEY`
 * - Model configured via `GEMINI_MODEL` (defaults to `gemini-2.5-flash`)
 * - In-flight timeout via Promise.race (8 seconds)
 * - Single automatic retry on transient upstream failures
 * - Output token cap to prevent runaway token usage
 * - Clean degradation: callers fall back to deterministic templating when unconfigured or unreachable.
 */

import { GoogleGenAI } from "@google/genai";
import { GeminiUnavailableError } from "@/lib/api";

export const DEFAULT_MODEL_NAME = "gemini-2.5-flash";
export const DEFAULT_TIMEOUT_MS = 8000;
export const MAX_OUTPUT_TOKENS = 800;

let cachedClient: GoogleGenAI | null = null;

/**
 * Check whether a valid Gemini API key is configured in the environment.
 */
export function isGeminiConfigured(): boolean {
	const key = process.env["GEMINI_API_KEY"];
	return typeof key === "string" && key.trim().length > 0;
}

/**
 * Retrieve the active model name.
 */
export function getModelName(): string {
	const envModel = process.env["GEMINI_MODEL"];
	return typeof envModel === "string" && envModel.trim().length > 0
		? envModel.trim()
		: DEFAULT_MODEL_NAME;
}

/**
 * Lazily construct or return cached GoogleGenAI instance.
 */
function getClient(): GoogleGenAI | null {
	if (cachedClient) return cachedClient;

	const apiKey = process.env["GEMINI_API_KEY"];
	if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
		return null;
	}

	cachedClient = new GoogleGenAI({ apiKey: apiKey.trim() });
	return cachedClient;
}

/**
 * Execute generation with timeout and single transient retry.
 *
 * @param prompt The complete user content payload.
 * @param systemInstruction System instruction string establishing grounding boundaries.
 * @returns Generated plain text string.
 * @throws {GeminiUnavailableError} When no API key is present or calls exhaust retries.
 */
export async function generateText(
	prompt: string,
	systemInstruction?: string,
): Promise<string> {
	const client = getClient();
	if (client === null) {
		throw new GeminiUnavailableError();
	}

	const model = getModelName();

	const runWithTimeout = async (): Promise<string> => {
		const generatePromise = client.models.generateContent({
			model,
			contents: prompt,
			config: {
				maxOutputTokens: MAX_OUTPUT_TOKENS,
				...(systemInstruction !== undefined ? { systemInstruction } : {}),
			},
		});

		let timer: NodeJS.Timeout | undefined;
		const timeoutPromise = new Promise<never>((_, reject) => {
			timer = setTimeout(() => {
				reject(new Error("Gemini API request timed out"));
			}, DEFAULT_TIMEOUT_MS);
		});

		try {
			const res = await Promise.race([generatePromise, timeoutPromise]);
			return res.text?.trim() ?? "";
		} finally {
			if (timer !== undefined) {
				clearTimeout(timer);
			}
		}
	};

	try {
		return await runWithTimeout();
	} catch (err) {
		// Transient single retry on failure
		try {
			return await runWithTimeout();
		} catch {
			throw new GeminiUnavailableError(
				err instanceof Error ? err.message : "Gemini service unavailable",
			);
		}
	}
}

/**
 * Reset client cache (used exclusively in unit tests).
 */
export function resetGeminiClient(): void {
	cachedClient = null;
}
