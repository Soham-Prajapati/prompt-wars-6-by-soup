/**
 * Maximum time allowed for each individual provider model attempt.
 */
export const DEFAULT_TIMEOUT_MS = 6000;

/**
 * Shared maximum generated-token budget for Gemini and Groq. The extra headroom
 * keeps reasoning-capable models from spending the entire response budget before
 * they reach the user-facing answer.
 */
export const MAX_OUTPUT_TOKENS = 1200;

/**
 * Read a non-empty server-side environment variable.
 */
export function readConfiguredEnv(name: string): string | undefined {
	const value = process.env[name];
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * Build a model chain with an optional configured model first and duplicates removed.
 */
export function buildModelChain(
	configuredModel: string | undefined,
	defaultModels: readonly string[],
): readonly string[] {
	return [...new Set([...(configuredModel !== undefined ? [configuredModel] : []), ...defaultModels])];
}
