/**
 * Unit tests for Frontend API Client Helpers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	fetchBriefing,
	fetchCleanAirPlan,
	searchLocationsClient,
	sendChatMessage,
} from "@/lib/client";
import { DEFAULT_PROFILE } from "@/lib/profile";
import { MOCK_PLAN, TEST_LOCATION } from "./helpers";

describe("Frontend Client Helpers", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		globalThis.fetch = vi.fn();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("searchLocationsClient fetches and decodes locations array", async () => {
		const mockLocations = [TEST_LOCATION];
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ locations: mockLocations }),
		});

		const res = await searchLocationsClient("Delhi");
		expect(res).toEqual(mockLocations);
		expect(globalThis.fetch).toHaveBeenCalledWith("/api/locations?q=Delhi");
	});

	it("searchLocationsClient throws an error when response is not ok", async () => {
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
			status: 500,
		});

		await expect(searchLocationsClient("ErrorCity")).rejects.toThrow("Failed to search locations");
	});

	it("fetchCleanAirPlan posts location and profile and decodes plan", async () => {
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ plan: MOCK_PLAN }),
		});

		const res = await fetchCleanAirPlan(TEST_LOCATION, DEFAULT_PROFILE);
		expect(res).toEqual(MOCK_PLAN);
	});

	it("fetchCleanAirPlan throws an error on failure", async () => {
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
		});

		await expect(fetchCleanAirPlan(TEST_LOCATION, DEFAULT_PROFILE)).rejects.toThrow(
			"Failed to generate plan",
		);
	});

	it("fetchBriefing posts plan and profile and decodes briefing payload", async () => {
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ briefing: "Test briefing text", source: "ai" }),
		});

		const res = await fetchBriefing(MOCK_PLAN, DEFAULT_PROFILE, "en");
		expect(res.briefing).toBe("Test briefing text");
		expect(res.source).toBe("ai");
	});

	it("fetchBriefing throws on HTTP error", async () => {
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
		});

		await expect(fetchBriefing(MOCK_PLAN, DEFAULT_PROFILE, "en")).rejects.toThrow(
			"Failed to fetch briefing",
		);
	});

	it("sendChatMessage sends question, history, and plan, decoding answer", async () => {
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve({ answer: "Wear an N95", source: "ai" }),
		});

		const res = await sendChatMessage("Which mask?", MOCK_PLAN, DEFAULT_PROFILE, "en", []);
		expect(res.answer).toBe("Wear an N95");
		expect(res.source).toBe("ai");
	});

	it("sendChatMessage throws on HTTP error", async () => {
		(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			ok: false,
		});

		await expect(
			sendChatMessage("Which mask?", MOCK_PLAN, DEFAULT_PROFILE, "en", []),
		).rejects.toThrow("Failed to send question");
	});
});
