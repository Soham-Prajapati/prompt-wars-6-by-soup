/**
 * Shared request passed to a text-generation provider.
 */
export interface TextGenerationRequest {
	/** User/content prompt for the provider. */
	readonly prompt: string;
	/** Optional system instruction that establishes the grounding boundary. */
	readonly systemInstruction?: string;
}

/**
 * Successful provider response with the model used for server-side observability.
 */
export interface TextGenerationResult {
	/** Generated plain text. */
	readonly text: string;
	/** Provider model that produced the text. */
	readonly model: string;
}

/**
 * Contract implemented by each server-side text-generation provider.
 */
export interface TextProvider {
	/** Stable provider label used only in server logs. */
	readonly name: string;
	/** Whether the provider has a usable server-side API key. */
	isConfigured(): boolean;
	/** Generate grounded text or throw when every model attempt fails. */
	generate(request: TextGenerationRequest): Promise<TextGenerationResult>;
}

/**
 * Error raised when a configured text provider cannot produce a response.
 */
export class TextProviderUnavailableError extends Error {
	/** Create a provider-unavailable error without exposing upstream details. */
	constructor(message = "The text provider is unavailable.") {
		super(message);
		this.name = "TextProviderUnavailableError";
	}
}
