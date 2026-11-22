/**
 * Google Gemini Generative AI Client.
 *
 * Uses the official `@google/genai` SDK (`GoogleGenAI`) to generate plain-language
 * family briefings and follow-up conversational answers strictly grounded in the
 * computed air quality decision engine facts.
 *
 * Security and reliability features:
 * - API key read strictly from server-side `GEMINI_API_KEY`
 * - Ordered model chain, with `GEMINI_MODEL` taking priority when configured
 * - Per-model timeout and no SDK-level retry amplification
 * - Automatic failover on unavailable, rate-limited, transient, or empty responses
 * - Output token cap to prevent runaway token usage
 * - Clean degradation: callers fall back to deterministic templating when unconfigured or unreachable.
 */

import { GoogleGenAI } from "@google/genai";
import { GeminiUnavailableError } from "@/lib/api";

/**
 * Models verified to answer text generation requests for the current deployment key.
 * Keep this list short: one configured model plus these two attempts must stay below
 * the route's latency budget even when an upstream model hangs.
 */
export const DEFAULT_MODEL_CHAIN = [
	"gemini-3.1-flash-lite",
	"gemini-3.5-flash-lite",
] as const;
export const DEFAULT_MODEL_NAME = DEFAULT_MODEL_CHAIN[0];
export const DEFAULT_TIMEOUT_MS = 6000;
export const MAX_OUTPUT_TOKENS = 800;

let cachedClient: GoogleGenAI | null = null;

/**
 * Check whether a valid Gemini API key is configured in the environment.
 */
export function isGeminiConfigured(): boolean {
	const key = process.env["GEMINI_API_KEY"];
	return typeof key === "string" && key.trim().length > 0;
}

/** Return the configured model, if any, without exposing its value. */
function getConfiguredModel(): string | undefined {
	const envModel = process.env["GEMINI_MODEL"];
	return typeof envModel === "string" && envModel.trim().length > 0 ? envModel.trim() : undefined;
}

/**
 * Build the ordered model chain. A custom model is tried first, then the verified
 * lightweight fallbacks; duplicate names are removed while preserving order.
 */
export function getModelChain(): readonly string[] {
	const configuredModel = getConfiguredModel();
	return [...new Set([...(configuredModel !== undefined ? [configuredModel] : []), ...DEFAULT_MODEL_CHAIN])];
}

/** Retrieve the first model that would be attempted. */
export function getModelName(): string {
	return getModelChain()[0] ?? DEFAULT_MODEL_NAME;
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

function getErrorStatus(error: unknown): number | undefined {
	if (typeof error !== "object" || error === null || !("status" in error)) {
		return undefined;
	}

	const status = error.status;
	return typeof status === "number" ? status : undefined;
}

/** Move on for model-specific availability failures and client-side timeouts. */
function shouldTryNextModel(error: unknown): boolean {
	const status = getErrorStatus(error);
	if (status !== undefined) {
		return status === 404 || status === 429 || status >= 500;
	}

	// Network failures and SDK timeout errors do not always expose an HTTP status.
	return true;
}

/** Execute one model attempt with a bounded timeout and no hidden SDK retries. */
async function generateWithModel(
	client: GoogleGenAI,
	model: string,
	prompt: string,
	systemInstruction?: string,
): Promise<string> {
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			controller.abort();
			reject(new Error("Gemini API request timed out"));
		}, DEFAULT_TIMEOUT_MS);
	});

	try {
		const generatePromise = client.models.generateContent({
			model,
			contents: prompt,
			config: {
				maxOutputTokens: MAX_OUTPUT_TOKENS,
				httpOptions: {
					timeout: DEFAULT_TIMEOUT_MS,
					retryOptions: { attempts: 1 },
				},
				abortSignal: controller.signal,
				...(systemInstruction !== undefined ? { systemInstruction } : {}),
			},
		});

		const response = await Promise.race([generatePromise, timeoutPromise]);
		const text = response.text?.trim() ?? "";
		if (text.length === 0) {
			throw new Error("Gemini returned an empty response");
		}
		return text;
	} finally {
		if (timer !== undefined) {
			clearTimeout(timer);
		}
	}
}

/**
 * Generate grounded text through the ordered model chain.
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
	const client = getClient();
	if (client === null) {
		throw new GeminiUnavailableError();
	}

	let lastError: unknown;
	for (const model of getModelChain()) {
		try {
			return await generateWithModel(client, model, prompt, systemInstruction);
		} catch (error) {
			lastError = error;
			if (!shouldTryNextModel(error)) {
				break;
			}
		}
	}

	throw new GeminiUnavailableError(
		lastError instanceof Error ? lastError.message : "Gemini service unavailable",
	);
}

/**
 * Reset client cache (used exclusively in unit tests).
 */
export function resetGeminiClient(): void {
	cachedClient = null;
}
