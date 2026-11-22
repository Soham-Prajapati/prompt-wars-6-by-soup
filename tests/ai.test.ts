/**
 * Provider orchestration and Groq failover tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TIMEOUT_MS } from "@/lib/ai/config";
import { generateText } from "@/lib/ai/orchestrator";
import {
	DEFAULT_GROQ_MODEL_CHAIN,
	GROQ_CHAT_COMPLETIONS_URL,
	getGroqModelChain,
	groqProvider,
	isGroqConfigured,
} from "@/lib/ai/groq";
import { TextProviderUnavailableError, type TextProvider } from "@/lib/ai/types";

const originalFetch = globalThis.fetch;
const originalEnv = process.env;

interface TestProvider {
	readonly provider: TextProvider;
	readonly generate: ReturnType<typeof vi.fn>;
}

function provider(
	name: string,
	configured: boolean,
	result: string | Error,
	model = `${name}-model`,
): TestProvider {
	const generate = vi.fn(() => {
		if (result instanceof Error) return Promise.reject(result);
		return Promise.resolve({ text: result, model });
	});
	return {
		provider: { name, isConfigured: () => configured, generate },
		generate,
	};
}

function pendingFetch(): Promise<Response> {
	return new Promise<Response>(() => undefined);
}

describe("text provider orchestrator", () => {
	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("uses Groq after Gemini fails and skips unconfigured providers", async () => {
		const skipped = provider("skipped", false, "should not run");
		const gemini = provider("gemini", true, new Error("Gemini failed"));
		const groq = provider("groq", true, "Groq answered", "openai/gpt-oss-120b");

		await expect(
			generateText(
				{ prompt: "facts", systemInstruction: "grounding" },
				[skipped.provider, gemini.provider, groq.provider],
			),
		).resolves.toBe("Groq answered");
		expect(skipped.generate).not.toHaveBeenCalled();
		expect(gemini.generate).toHaveBeenCalledTimes(1);
		expect(groq.generate).toHaveBeenCalledTimes(1);
		expect(vi.mocked(console.warn)).toHaveBeenCalledWith("[ai] provider=groq model=openai/gpt-oss-120b");
	});

	it("reports unavailable when every configured provider fails", async () => {
		const gemini = provider("gemini", true, new Error("failed"));
		const groq = provider("groq", true, new Error("failed"));

		await expect(generateText({ prompt: "facts" }, [gemini.provider, groq.provider])).rejects.toBeInstanceOf(
			TextProviderUnavailableError,
		);
	});
});

describe("Groq provider", () => {
	beforeEach(() => {
		process.env = { ...originalEnv, GROQ_API_KEY: "groq-test-key" };
		delete process.env["GROQ_MODEL"];
		globalThis.fetch = vi.fn();
	});

	afterEach(() => {
		process.env = originalEnv;
		globalThis.fetch = originalFetch;
		vi.useRealTimers();
	});

	it("uses the OpenAI-compatible endpoint and validates a successful response", async () => {
		process.env["GROQ_MODEL"] = "custom/groq-model";
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ choices: [{ message: { content: "  Grounded Groq answer.  " } }] }),
		});

		const result = await groqProvider.generate({
			prompt: "<household_facts>facts</household_facts>",
			systemInstruction: "Use only facts.",
		});

		expect(result).toEqual({ text: "Grounded Groq answer.", model: "custom/groq-model" });
		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
		const [url, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
			string,
			RequestInit,
		];
		expect(url).toBe(GROQ_CHAT_COMPLETIONS_URL);
		expect(init.method).toBe("POST");
		expect((init.headers as Record<string, string>).Authorization).toBe("Bearer groq-test-key");
		expect(typeof init.body).toBe("string");
		expect(JSON.parse(init.body as string) as unknown).toEqual({
			model: "custom/groq-model",
			messages: [
				{ role: "system", content: "Use only facts." },
				{ role: "user", content: "<household_facts>facts</household_facts>" },
			],
			max_tokens: 1200,
			reasoning_effort: "low",
		});
	});

	it("limits reasoning and hides the reasoning trace for the gpt-oss model", async () => {
		delete process.env["GROQ_MODEL"];
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve({ choices: [{ message: { content: "Answer with room left for reasoning." } }] }),
		});

		await expect(groqProvider.generate({ prompt: "facts" })).resolves.toMatchObject({
			model: DEFAULT_GROQ_MODEL_CHAIN[0],
		});
		const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
		expect(JSON.parse(init.body as string) as unknown).toMatchObject({
			model: "openai/gpt-oss-120b",
			max_tokens: 1200,
			reasoning_effort: "low",
			include_reasoning: false,
		});
	});

	it("builds the configured model chain before the verified fallbacks", () => {
		process.env["GROQ_MODEL"] = DEFAULT_GROQ_MODEL_CHAIN[0];
		expect(getGroqModelChain()).toEqual(DEFAULT_GROQ_MODEL_CHAIN);
		expect(isGroqConfigured()).toBe(true);
	});

	it("moves to the next Groq model after a timeout", async () => {
		vi.useFakeTimers();
		globalThis.fetch = vi.fn(pendingFetch);

		const result = groqProvider.generate({ prompt: "facts" });
		const rejected = expect(result).rejects.toBeInstanceOf(TextProviderUnavailableError);
		await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS * DEFAULT_GROQ_MODEL_CHAIN.length);

		await rejected;
		expect(globalThis.fetch).toHaveBeenCalledTimes(DEFAULT_GROQ_MODEL_CHAIN.length);
		const firstInit = ((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit])[1];
		expect((firstInit.signal as AbortSignal).aborted).toBe(true);
	});

	it.each([
		["4xx", { ok: false, status: 400, json: () => Promise.resolve({}) }],
		["5xx", { ok: false, status: 503, json: () => Promise.resolve({}) }],
		["invalid JSON", { ok: true, status: 200, json: () => Promise.resolve({ choices: [] }) }],
	] as const)("fails over after %s response", async (_label, response) => {
		process.env["GROQ_MODEL"] = "one-model";
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(response);

		await expect(groqProvider.generate({ prompt: "facts" })).rejects.toBeInstanceOf(
			TextProviderUnavailableError,
		);
		expect(globalThis.fetch).toHaveBeenCalledTimes(DEFAULT_GROQ_MODEL_CHAIN.length + 1);
	});

	it("fails over after malformed JSON from Groq", async () => {
		process.env["GROQ_MODEL"] = "one-model";
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.reject(new SyntaxError("invalid JSON")),
		});

		await expect(groqProvider.generate({ prompt: "facts" })).rejects.toBeInstanceOf(
			TextProviderUnavailableError,
		);
	});

	it("is skipped by the orchestrator without a Groq key", async () => {
		delete process.env["GROQ_API_KEY"];
		const groq = groqProvider;

		await expect(generateText({ prompt: "facts" }, [groq])).rejects.toBeInstanceOf(
			TextProviderUnavailableError,
		);
		expect(globalThis.fetch).not.toHaveBeenCalled();
		expect(isGroqConfigured()).toBe(false);
	});
});
