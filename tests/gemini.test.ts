/**
 * Unit tests for Gemini Generative AI Client and Error Degradation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiUnavailableError } from "@/lib/api";
import {
	DEFAULT_MODEL_CHAIN,
	DEFAULT_MODEL_NAME,
	DEFAULT_TIMEOUT_MS,
	generateText,
	getModelChain,
	getModelName,
	isGeminiConfigured,
	resetGeminiClient,
} from "@/lib/gemini";

interface MockResponse {
	text?: string | null;
}

interface GenerateRequest {
	model: string;
	config: {
		maxOutputTokens: number;
		httpOptions: {
			timeout: number;
			retryOptions: { attempts: number };
		};
		abortSignal: AbortSignal;
		systemInstruction?: string;
	};
}

// Mock @google/genai
const mockGenerateContent = vi.fn<(request: GenerateRequest) => Promise<MockResponse>>();

vi.mock("@google/genai", () => {
	return {
		GoogleGenAI: class MockGoogleGenAI {
			models = {
				generateContent: mockGenerateContent,
			};
		},
	};
});

function httpError(status: number): Error & { status: number } {
	const error = new Error(`Gemini request failed with ${String(status)}`) as Error & { status: number };
	error.status = status;
	return error;
}

describe("Gemini Configuration and Environment Checks", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
		resetGeminiClient();
		mockGenerateContent.mockReset();
	});

	afterEach(() => {
		process.env = originalEnv;
		resetGeminiClient();
	});

	it("reports unconfigured when GEMINI_API_KEY is missing", () => {
		delete process.env["GEMINI_API_KEY"];
		expect(isGeminiConfigured()).toBe(false);
	});

	it("reports unconfigured when GEMINI_API_KEY is empty whitespace", () => {
		process.env["GEMINI_API_KEY"] = "   ";
		expect(isGeminiConfigured()).toBe(false);
	});

	it("reports configured when valid GEMINI_API_KEY is provided", () => {
		process.env["GEMINI_API_KEY"] = "AIzaSyFakeKey123";
		expect(isGeminiConfigured()).toBe(true);
	});

	it("defaults to the first verified model", () => {
		delete process.env["GEMINI_MODEL"];
		expect(getModelName()).toBe(DEFAULT_MODEL_NAME);
		expect(getModelChain()).toEqual(DEFAULT_MODEL_CHAIN);
	});

	it("puts GEMINI_MODEL before the verified fallbacks", () => {
		process.env["GEMINI_MODEL"] = "gemini-2.5-pro";
		expect(getModelName()).toBe("gemini-2.5-pro");
		expect(getModelChain()).toEqual([
			"gemini-2.5-pro",
			...DEFAULT_MODEL_CHAIN,
		]);
	});

	it("does not duplicate a configured fallback model", () => {
		process.env["GEMINI_MODEL"] = DEFAULT_MODEL_NAME;
		expect(getModelChain()).toEqual(DEFAULT_MODEL_CHAIN);
	});
});

describe("generateText Execution", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv, GEMINI_API_KEY: "fake-key-for-test" };
		delete process.env["GEMINI_MODEL"];
		resetGeminiClient();
		mockGenerateContent.mockReset();
	});

	afterEach(() => {
		process.env = originalEnv;
		resetGeminiClient();
	});

	it("throws GeminiUnavailableError if API key is not configured", async () => {
		delete process.env["GEMINI_API_KEY"];
		resetGeminiClient();

		await expect(generateText("hello")).rejects.toThrow(GeminiUnavailableError);
	});

	it("generates text from prompt and system instruction", async () => {
		mockGenerateContent.mockResolvedValueOnce({
			text: "Air quality is very unhealthy. Keep windows closed.",
		});

		const text = await generateText("Test prompt", "System instruction");
		expect(text).toBe("Air quality is very unhealthy. Keep windows closed.");
		expect(mockGenerateContent).toHaveBeenCalledTimes(1);
		const firstRequest = mockGenerateContent.mock.calls[0]?.[0];
		expect(firstRequest?.model).toBe(DEFAULT_MODEL_NAME);
		expect(firstRequest?.config.httpOptions).toEqual({
			timeout: DEFAULT_TIMEOUT_MS,
			retryOptions: { attempts: 1 },
		});
	});

	it("moves to the next model after a transient failure", async () => {
		mockGenerateContent.mockRejectedValueOnce(httpError(503));
		mockGenerateContent.mockResolvedValueOnce({
			text: "Recovered successfully after transient error.",
		});

		const text = await generateText("Test prompt");
		expect(text).toBe("Recovered successfully after transient error.");
		expect(mockGenerateContent).toHaveBeenCalledTimes(2);
		expect(mockGenerateContent.mock.calls.map(([request]) => request.model)).toEqual([
			...DEFAULT_MODEL_CHAIN,
		]);
	});

	it.each([404, 429, 500])(
		"moves to the next model after HTTP %s",
		async (status) => {
			mockGenerateContent.mockRejectedValueOnce(httpError(status));
			mockGenerateContent.mockResolvedValueOnce({ text: "Fallback model answered." });

			await expect(generateText("Test prompt")).resolves.toBe("Fallback model answered.");
			expect(mockGenerateContent).toHaveBeenCalledTimes(2);
		},
	);

	it("moves to the next model after a timeout", async () => {
		vi.useFakeTimers();
		try {
			mockGenerateContent
				.mockImplementationOnce(() => new Promise<never>(() => undefined))
				.mockResolvedValueOnce({ text: "Recovered after timeout." });

			const result = generateText("Test prompt");
			await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS);

			await expect(result).resolves.toBe("Recovered after timeout.");
			expect(mockGenerateContent).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});

	it("tries every verified model before throwing GeminiUnavailableError", async () => {
		mockGenerateContent.mockRejectedValue(httpError(503));

		await expect(generateText("Test prompt")).rejects.toThrow(GeminiUnavailableError);
		expect(mockGenerateContent).toHaveBeenCalledTimes(DEFAULT_MODEL_CHAIN.length);
	});

	it("does not fail over a non-retryable client error", async () => {
		mockGenerateContent.mockRejectedValueOnce(httpError(400));

		await expect(generateText("Test prompt")).rejects.toThrow(GeminiUnavailableError);
		expect(mockGenerateContent).toHaveBeenCalledTimes(1);
	});

	it("skips an empty response and uses the next model", async () => {
		mockGenerateContent.mockResolvedValueOnce({
			text: null,
		});
		mockGenerateContent.mockResolvedValueOnce({
			text: "The fallback model returned useful text.",
		});

		const text = await generateText("Test prompt");
		expect(text).toBe("The fallback model returned useful text.");
		expect(mockGenerateContent).toHaveBeenCalledTimes(2);
	});
});
