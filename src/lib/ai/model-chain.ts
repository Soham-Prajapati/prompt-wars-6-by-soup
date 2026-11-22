import { TextProviderUnavailableError, type TextGenerationResult } from "@/lib/ai/types";

/**
 * One model attempt used by the shared provider model-chain runner.
 */
export type ModelAttempt = (model: string) => Promise<string>;

/**
 * Decide whether a failed model attempt should be followed by another model.
 */
export type ShouldTryNextModel = (error: unknown) => boolean;

/**
 * Run an ordered model chain and return the first non-empty text response.
 *
 * @param models Ordered model names.
 * @param attempt Provider-specific model call.
 * @param shouldTryNext Optional provider-specific retry policy.
 * @throws {TextProviderUnavailableError} When the chain is exhausted.
 */
export async function runModelChain(
	models: readonly string[],
	attempt: ModelAttempt,
	shouldTryNext: ShouldTryNextModel = () => true,
): Promise<TextGenerationResult> {
	let lastError: unknown;

	for (const model of models) {
		try {
			const text = (await attempt(model)).trim();
			if (text.length === 0) {
				throw new Error("The provider returned an empty response.");
			}
			return { text, model };
		} catch (error) {
			lastError = error;
			if (!shouldTryNext(error)) {
				break;
			}
		}
	}

	throw new TextProviderUnavailableError(
		lastError instanceof Error ? lastError.message : "The text provider is unavailable.",
	);
}

/**
 * Execute one provider request with an AbortController timeout.
 *
 * @param timeoutMs Maximum duration for this attempt.
 * @param operation Request operation receiving the abort signal.
 * @param timeoutMessage Internal timeout message used for failover.
 */
export async function withAbortTimeout<T>(
	timeoutMs: number,
	operation: (signal: AbortSignal) => Promise<T>,
	timeoutMessage: string,
): Promise<T> {
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeoutPromise = new Promise<never>((_, reject) => {
		timer = setTimeout(() => {
			controller.abort();
			reject(new Error(timeoutMessage));
		}, timeoutMs);
	});

	try {
		return await Promise.race([operation(controller.signal), timeoutPromise]);
	} finally {
		if (timer !== undefined) {
			clearTimeout(timer);
		}
	}
}
