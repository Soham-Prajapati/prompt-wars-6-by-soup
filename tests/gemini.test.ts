/**
 * Unit tests for Gemini Generative AI Client and Error Degradation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiUnavailableError } from "@/lib/api";
import {
	DEFAULT_MODEL_NAME,
	generateText,
	getModelName,
	isGeminiConfigured,
	resetGeminiClient,
} from "@/lib/gemini";

// Mock @google/genai
const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => {
	return {
		GoogleGenAI: class MockGoogleGenAI {
			models = {
				generateContent: mockGenerateContent,
			};
		},
	};
});

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

	it("defaults model to gemini-2.5-flash", () => {
		delete process.env["GEMINI_MODEL"];
		expect(getModelName()).toBe(DEFAULT_MODEL_NAME);
	});

	it("reads custom model from GEMINI_MODEL", () => {
		process.env["GEMINI_MODEL"] = "gemini-2.5-pro";
		expect(getModelName()).toBe("gemini-2.5-pro");
	});
});

describe("generateText Execution", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv, GEMINI_API_KEY: "fake-key-for-test" };
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
	});

	it("retries once upon transient failure before throwing GeminiUnavailableError", async () => {
		// First call fails
		mockGenerateContent.mockRejectedValueOnce(new Error("503 Service Unavailable"));
		// Retry succeeds
		mockGenerateContent.mockResolvedValueOnce({
			text: "Recovered successfully after transient error.",
		});

		const text = await generateText("Test prompt");
		expect(text).toBe("Recovered successfully after transient error.");
		expect(mockGenerateContent).toHaveBeenCalledTimes(2);
	});

	it("throws GeminiUnavailableError when both initial call and retry fail", async () => {
		mockGenerateContent.mockRejectedValue(new Error("Resource exhausted"));

		await expect(generateText("Test prompt")).rejects.toThrow(GeminiUnavailableError);
		expect(mockGenerateContent).toHaveBeenCalledTimes(2);
	});

	it("handles empty or null response text safely", async () => {
		mockGenerateContent.mockResolvedValueOnce({
			text: null,
		});

		const text = await generateText("Test prompt");
		expect(text).toBe("");
	});
});
