/**
 * Ordered server-side text-provider orchestrator for ClearAir narration.
 */

import { geminiProvider } from "@/lib/ai/gemini";
import { groqProvider } from "@/lib/ai/groq";
import { TextProviderUnavailableError, type TextGenerationRequest, type TextProvider } from "@/lib/ai/types";

/**
 * Provider order for all grounded briefing and chat generation.
 */
export const DEFAULT_TEXT_PROVIDERS: readonly TextProvider[] = [geminiProvider, groqProvider];

/**
 * Whether at least one server-side AI provider is configured.
 */
export function isAiConfigured(): boolean {
	return DEFAULT_TEXT_PROVIDERS.some((provider) => provider.isConfigured());
}

/**
 * Generate text through configured providers in order, logging only the provider
 * and model that answered successfully.
 *
 * @param request Grounded prompt and system instruction.
 * @param providers Ordered providers, injectable for focused tests.
 * @throws {TextProviderUnavailableError} When every configured provider fails.
 */
export async function generateText(
	request: TextGenerationRequest,
	providers: readonly TextProvider[] = DEFAULT_TEXT_PROVIDERS,
): Promise<string> {
	let attemptedProvider = false;

	for (const provider of providers) {
		if (!provider.isConfigured()) continue;
		attemptedProvider = true;

		try {
			const result = await provider.generate(request);
			console.warn(`[ai] provider=${provider.name} model=${result.model}`);
			return result.text;
		} catch {
			// The next configured provider is the silent backup path.
		}
	}

	throw new TextProviderUnavailableError(
		attemptedProvider
			? "All configured text providers are unavailable."
			: "No text provider is configured.",
	);
}
