/**
 * Integration route tests for all ClearAir API endpoints.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getAirData } from "@/app/api/air-data/route";
import { POST as postBriefing } from "@/app/api/briefing/route";
import { POST as postChat } from "@/app/api/chat/route";
import { GET as getHealth } from "@/app/api/health/route";
import { GET as getLocations } from "@/app/api/locations/route";
import { POST as postPlan } from "@/app/api/plan/route";
import { resetGeminiClient } from "@/lib/gemini";
import { DEFAULT_PROFILE } from "@/lib/profile";
import { resetRateLimits } from "@/lib/rate-limit";
import {
	bodyOf,
	expectSecurityHeaders,
	MOCK_PLAN,
	requestWithJson,
	TEST_LOCATION,
} from "./helpers";

// Mock fetch for Open-Meteo
const mockFetch = vi.fn();

// Hoisted mocks for vi.mock
const { mockGenerateText } = vi.hoisted(() => ({
	mockGenerateText: vi.fn(),
}));

vi.mock("@/lib/ai/orchestrator", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/ai/orchestrator")>();
	return {
		...actual,
		generateText: mockGenerateText,
	};
});

describe("API Route Handlers", () => {
	const originalFetch = globalThis.fetch;
	const originalEnv = process.env;

	beforeEach(() => {
		resetRateLimits();
		resetGeminiClient();
		globalThis.fetch = mockFetch;
		mockFetch.mockReset();
		mockGenerateText.mockReset();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		process.env = originalEnv;
		resetRateLimits();
		resetGeminiClient();
	});

	describe("GET /api/health", () => {
		it("returns status ok and security headers", async () => {
			const res = await getHealth(new Request("http://localhost/api/health"));
			expect(res.status).toBe(200);
			const body = (await bodyOf(res)) as { status: string; product: string; aiConfigured: boolean };
			expect(body.status).toBe("ok");
			expect(body.product).toBe("ClearAir");
			expect(typeof body.aiConfigured).toBe("boolean");
			expectSecurityHeaders(res);
		});

		it("reports AI configured when only Groq has a key", async () => {
			delete process.env["GEMINI_API_KEY"];
			process.env["GROQ_API_KEY"] = "fake-groq-key";

			const res = await getHealth(new Request("http://localhost/api/health"));
			expect((await bodyOf(res)) as { aiConfigured: boolean }).toMatchObject({ aiConfigured: true });
		});
	});

	describe("GET /api/locations", () => {
		it("returns locations for valid query", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						results: [
							{
								id: 1,
								name: "Paris",
								country: "France",
								latitude: 48.8566,
								longitude: 2.3522,
							},
						],
					}),
			});

			const req = new Request("http://localhost/api/locations?q=Paris", {
				headers: { "x-forwarded-for": "1.1.1.1" },
			});
			const res = await getLocations(req);
			expect(res.status).toBe(200);
			const body = (await bodyOf(res)) as { locations: readonly unknown[] };
			expect(body.locations.length).toBe(1);
			expectSecurityHeaders(res);
		});

		it("returns 422 VALIDATION_ERROR when query is too short", async () => {
			const req = new Request("http://localhost/api/locations?q=a", {
				headers: { "x-forwarded-for": "1.1.1.2" },
			});
			const res = await getLocations(req);
			expect(res.status).toBe(422);
			const body = (await bodyOf(res)) as { error: { code: string } };
			expect(body.error.code).toBe("VALIDATION_ERROR");
		});

		it("returns 429 RATE_LIMITED when threshold exceeded", async () => {
			const ip = "1.1.1.3";
			for (let i = 0; i < 30; i++) {
				const req = new Request("http://localhost/api/locations?q=Rome", {
					headers: { "x-forwarded-for": ip },
				});
				mockFetch.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({ results: [] }),
				});
				await getLocations(req);
			}

			// 31st request triggers rate limit
			const blockedReq = new Request("http://localhost/api/locations?q=Rome", {
				headers: { "x-forwarded-for": ip },
			});
			const res = await getLocations(blockedReq);
			expect(res.status).toBe(429);
			const body = (await bodyOf(res)) as { error: { code: string } };
			expect(body.error.code).toBe("RATE_LIMITED");
		});
	});

	describe("GET /api/air-data", () => {
		it("returns live pollutants and hourly forecast for coordinates", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						current: { us_aqi: 75, pm2_5: 22.0 },
						hourly: { time: ["2026-11-22T00:00:00Z"], us_aqi: [75], pm2_5: [22.0] },
					}),
			});

			const req = new Request("http://localhost/api/air-data?lat=28.61&lon=77.20", {
				headers: { "x-forwarded-for": "2.2.2.1" },
			});
			const res = await getAirData(req);
			expect(res.status).toBe(200);
			const body = (await bodyOf(res)) as { pollutants: { usAqi: number } };
			expect(body.pollutants.usAqi).toBe(75);
		});

		it("returns 422 for invalid coordinate values", async () => {
			const req = new Request("http://localhost/api/air-data?lat=95&lon=200", {
				headers: { "x-forwarded-for": "2.2.2.2" },
			});
			const res = await getAirData(req);
			expect(res.status).toBe(422);
		});

		it("returns a uniform 502 when upstream data fails schema validation", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ unexpected: "payload" }),
			});
			const req = new Request("http://localhost/api/air-data?lat=28.62&lon=77.21", {
				headers: { "x-forwarded-for": "2.2.2.3" },
			});
			const res = await getAirData(req);
			expect(res.status).toBe(502);
			expect((await bodyOf(res)) as { error: { code: string } }).toMatchObject({
				error: { code: "UPSTREAM_UNAVAILABLE" },
			});
		});
	});

	describe("POST /api/plan", () => {
		it("computes full CleanAirPlan from location and profile", async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: () =>
					Promise.resolve({
						current: { us_aqi: 140, pm2_5: 48.0 },
						hourly: { time: ["2026-11-22T12:00:00Z"], us_aqi: [140], pm2_5: [48.0] },
					}),
			});

			const payload = JSON.stringify({
				location: TEST_LOCATION,
				profile: DEFAULT_PROFILE,
			});
			const req = requestWithJson("http://localhost/api/plan", payload, "3.3.3.1");
			const res = await postPlan(req);

			expect(res.status).toBe(200);
			const body = (await bodyOf(res)) as { plan: { currentAqi: number; rankedHacks: unknown[] } };
			expect(body.plan.currentAqi).toBe(140);
			expect(body.plan.rankedHacks.length).toBeGreaterThan(0);
		});

		it("returns 400 MALFORMED_BODY for malformed JSON payload", async () => {
			const req = requestWithJson("http://localhost/api/plan", '{"location":', "3.3.3.2");
			const res = await postPlan(req);
			expect(res.status).toBe(400);
		});

		it("rejects a plan context with an invalid location shape", async () => {
			const req = requestWithJson(
				"http://localhost/api/plan",
				JSON.stringify({ location: { name: "Delhi" }, profile: DEFAULT_PROFILE }),
				"3.3.3.3",
			);
			const res = await postPlan(req);
			expect(res.status).toBe(422);
		});
	});

	describe("POST /api/briefing", () => {
		it("returns AI briefing when Gemini is configured and generates successfully", async () => {
			process.env["GEMINI_API_KEY"] = "fake-key";
			mockGenerateText.mockResolvedValueOnce("## AI Family Briefing: Stay inside today.");

			const payload = JSON.stringify({
				plan: MOCK_PLAN,
				profile: DEFAULT_PROFILE,
				language: "en",
			});
			const req = requestWithJson("http://localhost/api/briefing", payload, "4.4.4.1");
			const res = await postBriefing(req);

			expect(res.status).toBe(200);
			const body = (await bodyOf(res)) as { briefing: string; source: string };
			expect(body.source).toBe("ai");
			expect(body.briefing).toContain("AI Family Briefing");
		});

		it("gracefully falls back to deterministic briefing when Gemini is not configured", async () => {
			delete process.env["GEMINI_API_KEY"];

			const payload = JSON.stringify({
				plan: MOCK_PLAN,
				profile: DEFAULT_PROFILE,
				language: "en",
			});
			const req = requestWithJson("http://localhost/api/briefing", payload, "4.4.4.2");
			const res = await postBriefing(req);

			expect(res.status).toBe(200);
			const body = (await bodyOf(res)) as { briefing: string; source: string };
			expect(body.source).toBe("fallback");
			expect(body.briefing).toContain("Daily Air Quality Briefing for New Delhi");
		});

		it("falls back to the template when both AI providers fail", async () => {
			process.env["GEMINI_API_KEY"] = "fake-key";
			mockGenerateText.mockRejectedValueOnce(new Error("Upstream timeout"));

			const payload = JSON.stringify({
				plan: MOCK_PLAN,
				profile: DEFAULT_PROFILE,
				language: "en",
			});
			const req = requestWithJson("http://localhost/api/briefing", payload, "4.4.4.3");
			const res = await postBriefing(req);

			expect(res.status).toBe(200);
			const body = (await bodyOf(res)) as { briefing: string; source: string };
			expect(body.source).toBe("fallback");
			expect(body.briefing).toContain("Daily Air Quality Briefing for New Delhi");
		});

		it("falls back to deterministic briefing when model returns empty string", async () => {
			process.env["GEMINI_API_KEY"] = "fake-key";
			mockGenerateText.mockResolvedValueOnce("");

			const payload = JSON.stringify({
				plan: MOCK_PLAN,
				profile: DEFAULT_PROFILE,
				language: "en",
			});
			const req = requestWithJson("http://localhost/api/briefing", payload, "4.4.4.4");
			const res = await postBriefing(req);

			expect(res.status).toBe(200);
			const body = (await bodyOf(res)) as { briefing: string; source: string };
			expect(body.source).toBe("fallback");
		});

		it("rejects an unvalidated or incomplete plan context", async () => {
			const req = requestWithJson(
				"http://localhost/api/briefing",
				JSON.stringify({ plan: {}, profile: DEFAULT_PROFILE, language: "en" }),
				"4.4.4.5",
			);
			const res = await postBriefing(req);
			expect(res.status).toBe(422);
		});
	});

	describe("POST /api/chat", () => {
		it("answers question via Gemini when configured", async () => {
			process.env["GEMINI_API_KEY"] = "fake-key";
			mockGenerateText.mockResolvedValueOnce("Wear an N95 mask outdoors.");

			const payload = JSON.stringify({
				question: "What mask should I wear?",
				plan: MOCK_PLAN,
				profile: DEFAULT_PROFILE,
				language: "en",
			});
			const req = requestWithJson("http://localhost/api/chat", payload, "5.5.5.1");
			const res = await postChat(req);

			expect(res.status).toBe(200);
			const body = (await bodyOf(res)) as { answer: string; source: string };
			expect(body.source).toBe("ai");
			expect(body.answer).toBe("Wear an N95 mask outdoors.");
		});

		it("answers question via deterministic fallback when unconfigured", async () => {
			delete process.env["GEMINI_API_KEY"];

			const payload = JSON.stringify({
				question: "What mask should I wear?",
				plan: MOCK_PLAN,
				profile: DEFAULT_PROFILE,
				language: "en",
			});
			const req = requestWithJson("http://localhost/api/chat", payload, "5.5.5.2");
			const res = await postChat(req);

			expect(res.status).toBe(200);
			const body = (await bodyOf(res)) as { answer: string; source: string };
			expect(body.source).toBe("fallback");
			expect(body.answer).toContain("N95 or FFP2 respirator");
		});

		it("falls back to deterministic chat answer when model returns empty string", async () => {
			process.env["GEMINI_API_KEY"] = "fake-key";
			mockGenerateText.mockResolvedValueOnce("");

			const payload = JSON.stringify({
				question: "What mask should I wear?",
				plan: MOCK_PLAN,
				profile: DEFAULT_PROFILE,
				language: "en",
			});
			const req = requestWithJson("http://localhost/api/chat", payload, "5.5.5.4");
			const res = await postChat(req);

			expect(res.status).toBe(200);
			const body = (await bodyOf(res)) as { answer: string; source: string };
			expect(body.source).toBe("fallback");
		});

		it("passes previous chat conversation history without error", async () => {
			process.env["GEMINI_API_KEY"] = "fake-key";
			mockGenerateText.mockResolvedValueOnce("Keep windows closed.");

			const payload = JSON.stringify({
				question: "And when should we ventilate?",
				plan: MOCK_PLAN,
				profile: DEFAULT_PROFILE,
				language: "en",
				history: [
					{ role: "user", content: "Is it smoky outside?" },
					{ role: "assistant", content: "Yes, AQI is 220." },
				],
			});
			const req = requestWithJson("http://localhost/api/chat", payload, "5.5.5.5");
			const res = await postChat(req);

			expect(res.status).toBe(200);
		});

		it("rejects empty questions with 422 VALIDATION_ERROR", async () => {
			const payload = JSON.stringify({
				question: "",
				plan: MOCK_PLAN,
				profile: DEFAULT_PROFILE,
				language: "en",
			});
			const req = requestWithJson("http://localhost/api/chat", payload, "5.5.5.3");
			const res = await postChat(req);
			expect(res.status).toBe(422);
		});
	});
});
