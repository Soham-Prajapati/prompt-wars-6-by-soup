/**
 * Frontend API client helpers for ClearAir.
 *
 * Provides strongly-typed fetch wrappers for interacting with the ClearAir backend.
 */

import type {
	CleanAirPlan,
	GeoLocation,
	HouseholdProfile,
	SupportedLanguage,
} from "@/lib/types";

/** Response returned by the briefing endpoint. */
export interface BriefingResponse {
	readonly briefing: string;
	readonly source: "ai" | "fallback";
}

/** Response returned by the grounded chat endpoint. */
export interface ChatResponse {
	readonly answer: string;
	readonly source: "ai" | "fallback";
}

/** A single client-side chat history entry. */
export interface ChatMessage {
	readonly role: "user" | "assistant";
	readonly content: string;
}

/**
 * Search locations by name.
 */
export async function searchLocationsClient(
	query: string,
): Promise<readonly GeoLocation[]> {
	const res = await fetch(`/api/locations?q=${encodeURIComponent(query)}`);
	if (!res.ok) {
		throw new Error("Failed to search locations");
	}
	const data = (await res.json()) as { locations: readonly GeoLocation[] };
	return data.locations;
}

/**
 * Generate a complete CleanAirPlan for a location and household profile.
 */
export async function fetchCleanAirPlan(
	location: GeoLocation,
	profile: HouseholdProfile,
): Promise<CleanAirPlan> {
	const res = await fetch("/api/plan", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ location, profile }),
	});

	if (!res.ok) {
		throw new Error("Failed to generate plan");
	}

	const data = (await res.json()) as { plan: CleanAirPlan };
	return data.plan;
}

/**
 * Request an AI (or deterministic fallback) narrative briefing.
 */
export async function fetchBriefing(
	plan: CleanAirPlan,
	profile: HouseholdProfile,
	language: SupportedLanguage,
): Promise<BriefingResponse> {
	const res = await fetch("/api/briefing", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ plan, profile, language }),
	});

	if (!res.ok) {
		throw new Error("Failed to fetch briefing");
	}

	return (await res.json()) as BriefingResponse;
}

/**
 * Ask a follow-up question grounded in the CleanAirPlan.
 */
export async function sendChatMessage(
	question: string,
	plan: CleanAirPlan,
	profile: HouseholdProfile,
	language: SupportedLanguage,
	history: readonly ChatMessage[] = [],
): Promise<ChatResponse> {
	const res = await fetch("/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ question, plan, profile, language, history }),
	});

	if (!res.ok) {
		throw new Error("Failed to send question");
	}

	return (await res.json()) as ChatResponse;
}
