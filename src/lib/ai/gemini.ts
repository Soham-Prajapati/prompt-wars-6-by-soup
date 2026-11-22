/**
 * Gemini text provider implementation for grounded ClearAir narration.
 */

import { GoogleGenAI } from "@google/genai";
import { buildModelChain, DEFAULT_TIMEOUT_MS, MAX_OUTPUT_TOKENS, readConfiguredEnv } from "@/lib/ai/config";
import { runModelChain, withAbortTimeout } from "@/lib/ai/model-chain";
import type { TextGenerationRequest, TextProvider } from "@/lib/ai/types";

/**
 * Verified Gemini fallback models used when a configured model is unavailable.
 */
export const DEFAULT_GEMINI_MODEL_CHAIN = [
	"gemini-3.1-flash-lite",
	"gemini-3.5-flash-lite",
] as const;

let cachedClient: GoogleGenAI | null = null;

/**
 * Check whether a valid Gemini API key is configured.
 */
export function isGeminiConfigured(): boolean {
	return readConfiguredEnv("GEMINI_API_KEY") !== undefined;
}

/**
 * Return the ordered Gemini model chain with the configured model first.
 */
export function getGeminiModelChain(): readonly string[] {
	return buildModelChain(readConfiguredEnv("GEMINI_MODEL"), DEFAULT_GEMINI_MODEL_CHAIN);
}

/**
 * Lazily construct the server-only Gemini client.
 */
function getClient(): GoogleGenAI | null {
	if (cachedClient !== null) return cachedClient;

	const apiKey = readConfiguredEnv("GEMINI_API_KEY");
	if (apiKey === undefined) return null;

	cachedClient = new GoogleGenAI({ apiKey });
	return cachedClient;
}

/**
 * Read an HTTP status from an SDK error when one is available.
 */
function getErrorStatus(error: unknown): number | undefined {
	if (typeof error !== "object" || error === null || !("status" in error)) {
		return undefined;
	}

	const status = error.status;
	return typeof status === "number" ? status : undefined;
}

/**
 * Continue the Gemini model chain for availability and timeout failures.
 */
function shouldTryNextGeminiModel(error: unknown): boolean {
	const status = getErrorStatus(error);
	return status === undefined || status === 404 || status === 429 || status >= 500;
}

/**
 * Execute one Gemini model request with the shared output cap and timeout.
 */
async function generateWithModel(
	client: GoogleGenAI,
	model: string,
	request: TextGenerationRequest,
): Promise<string> {
	const response = await withAbortTimeout(
		DEFAULT_TIMEOUT_MS,
		(signal) =>
			client.models.generateContent({
				model,
				contents: request.prompt,
				config: {
					maxOutputTokens: MAX_OUTPUT_TOKENS,
					httpOptions: {
						timeout: DEFAULT_TIMEOUT_MS,
						retryOptions: { attempts: 1 },
					},
					abortSignal: signal,
					...(request.systemInstruction !== undefined
						? { systemInstruction: request.systemInstruction }
						: {}),
				},
			}),
		"Gemini API request timed out",
	);

	const text = response.text?.trim() ?? "";
	if (text.length === 0) {
		throw new Error("Gemini returned an empty response.");
	}
	return text;
}

/**
 * Server-side Gemini provider used by the shared AI orchestrator.
 */
export const geminiProvider: TextProvider = {
	name: "gemini",
	isConfigured: isGeminiConfigured,
	async generate(request) {
		const client = getClient();
		if (client === null) {
			throw new Error("Gemini is not configured.");
		}

		return runModelChain(
			getGeminiModelChain(),
			(model) => generateWithModel(client, model, request),
			shouldTryNextGeminiModel,
		);
	},
};

/**
 * Reset the cached Gemini client for isolated tests.
 */
export function resetGeminiClient(): void {
	cachedClient = null;
}
