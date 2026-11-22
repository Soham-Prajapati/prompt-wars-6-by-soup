/**
 * Shared test helpers for the ClearAir test suite.
 */

import { expect } from "vitest";
import { SECURITY_HEADERS } from "@/lib/api";
import type {
	CleanAirPlan,
	GeoLocation,
	HouseholdProfile,
	PollutantBreakdown,
} from "@/lib/types";

/**
 * Read a response body as unknown.
 */
export async function bodyOf(response: Response): Promise<unknown> {
	return (await response.json()) as unknown;
}

/**
 * Assert that all standard security headers are present with correct values.
 */
export function expectSecurityHeaders(response: Response): void {
	for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
		expect(response.headers.get(name), name).toBe(value);
	}
}

/**
 * Build a mock POST request with a JSON body string.
 */
export function requestWithJson(url: string, raw: string, ip = "192.168.1.1"): Request {
	return new Request(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-forwarded-for": ip,
		},
		body: raw,
	});
}

/**
 * Sample test location.
 */
export const TEST_LOCATION: GeoLocation = {
	id: 1273294,
	name: "New Delhi",
	country: "India",
	admin1: "Delhi",
	latitude: 28.6139,
	longitude: 77.209,
	timezone: "Asia/Kolkata",
};

/**
 * Sample test profile with children and asthmatic members.
 */
export const TEST_PROFILE_SENSITIVE: HouseholdProfile = {
	childrenUnder12: 2,
	adultsOver65: 1,
	pregnant: true,
	respiratoryCondition: true,
	outdoorWorker: true,
	commuteMode: "car_solo",
	commuteDistanceKm: 15,
	cookingFuel: "biomass",
	heating: "wood",
	hasAirPurifier: false,
	hasN95Masks: false,
	homeType: "apartment",
	smokerInHouse: true,
};

/**
 * Sample test profile for healthy adults with green commute.
 */
export const TEST_PROFILE_HEALTHY: HouseholdProfile = {
	childrenUnder12: 0,
	adultsOver65: 0,
	pregnant: false,
	respiratoryCondition: false,
	outdoorWorker: false,
	commuteMode: "bicycle",
	commuteDistanceKm: 5,
	cookingFuel: "induction",
	heating: "electric",
	hasAirPurifier: true,
	hasN95Masks: true,
	homeType: "detached",
	smokerInHouse: false,
};

/**
 * Sample test pollutants representing severe smog.
 */
export const TEST_POLLUTANTS_SEVERE: PollutantBreakdown = {
	usAqi: 245,
	pm25: 195.4,
	pm10: 310.2,
	no2: 68.5,
	o3: 42.1,
	co: 850.0,
};

/**
 * Sample test pollutants representing good air.
 */
export const TEST_POLLUTANTS_GOOD: PollutantBreakdown = {
	usAqi: 35,
	pm25: 8.2,
	pm10: 22.0,
	no2: 14.1,
	o3: 28.0,
	co: 150.0,
};

/**
 * Sample mock CleanAirPlan for tests.
 */
export const MOCK_PLAN: CleanAirPlan = {
	location: TEST_LOCATION,
	currentAqi: 220,
	currentBand: {
		code: "very_unhealthy",
		label: "Very Unhealthy",
		minAqi: 201,
		maxAqi: 300,
		severity: "critical",
		description: "Health alert: The risk of health effects is significantly increased.",
		icon: "🚨",
	},
	dominantPollutant: {
		name: "PM2.5",
		concentration: 170.5,
		unit: "µg/m³",
	},
	pollutants: TEST_POLLUTANTS_SEVERE,
	bestWindow: {
		startHour: "13:00",
		endHour: "15:00",
		durationHours: 2,
		averageAqi: 135,
		minAqi: 120,
		averagePm25: 48.5,
		recommendation: "Cautious window. Shift essential errands here.",
	},
	forecast24h: [
		{
			timestamp: "2026-11-22T00:00:00Z",
			hourLabel: "00:00",
			usAqi: 230,
			pm25: 180,
			pm10: 290,
			no2: 60,
			o3: 30,
			co: 700,
			bandCode: "very_unhealthy",
			bandLabel: "Very Unhealthy",
			isBestWindow: false,
		},
		{
			timestamp: "2026-11-22T13:00:00Z",
			hourLabel: "13:00",
			usAqi: 135,
			pm25: 48.5,
			pm10: 110,
			no2: 35,
			o3: 45,
			co: 400,
			bandCode: "unhealthy_sensitive",
			bandLabel: "Unhealthy for Sensitive Groups",
			isBestWindow: true,
		},
	],
	memberRisks: [
		{
			memberType: "Children (under 12)",
			count: 2,
			riskTier: "critical",
			physiologicalReason: "Developing lungs.",
			protectiveAction: "Keep strictly indoors.",
		},
	],
	dailyRoutine: [
		{
			id: "routine-morning-inversion",
			timeSpan: "06:00 – 09:00",
			label: "Morning Inversion",
			outdoorActivityAllowed: false,
			ventilationAdvice: "Keep windows shut.",
			actionDescription: "Lockdown.",
			targetedMembers: ["Children under 12"],
		},
	],
	rankedHacks: [
		{
			id: "diy-corsi-rosenthal",
			rank: 1,
			title: "Build Box Fan + MERV-13 Filter",
			impactCategory: "high",
			pm25ReductionPct: 75,
			estimatedCost: "low",
			summary: "Low cost high impact filtration.",
			instructions: ["Tape filter to fan."],
			relevanceReason: "Immediate relief.",
		},
	],
	alternatives: [
		{
			id: "commute-shift-metro",
			category: "commute",
			title: "Switch Solo Car to Metro",
			currentOption: "Solo car",
			proposedOption: "Metro",
			co2AvoidedKgWeekly: 10.5,
			pm25AvoidedGramsWeekly: 1.8,
			indoorPm25ReductionPct: 0,
			rationale: "Cuts vehicle emissions.",
			scientificBasis: "EPA transit factors.",
		},
	],
	exposureImpact: {
		baselineInhaledPm25UgDay: 2450,
		optimizedInhaledPm25UgDay: 610,
		netReductionPct: 75,
		factors: [
			{
				intervention: "HEPA Filtration",
				relativeReductionPct: 72,
				mechanism: "Mechanical capture.",
			},
		],
	},
	computedAt: "2026-11-22T04:40:00.000Z",
};
