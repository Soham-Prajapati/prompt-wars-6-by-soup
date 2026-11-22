/**
 * Unit tests for Inbound Zod Schemas and Input Validation.
 */

import { describe, expect, it } from "vitest";
import {
	airQualityQuerySchema,
	briefingRequestSchema,
	chatMessageSchema,
	chatRequestSchema,
	cleanAirPlanSchema,
	geocodeQuerySchema,
	householdProfileSchema,
} from "@/lib/validation";
import { DEFAULT_PROFILE } from "@/lib/profile";
import { MOCK_PLAN } from "./helpers";

describe("geocodeQuerySchema", () => {
	it("accepts valid city queries and trims whitespace", () => {
		const parsed = geocodeQuerySchema.parse({ q: "  London  " });
		expect(parsed.q).toBe("London");
	});

	it("rejects queries under 2 characters", () => {
		expect(() => geocodeQuerySchema.parse({ q: "a" })).toThrow();
		expect(() => geocodeQuerySchema.parse({ q: "   " })).toThrow();
	});

	it("rejects queries exceeding 100 characters", () => {
		const long = "a".repeat(105);
		expect(() => geocodeQuerySchema.parse({ q: long })).toThrow();
	});
});

describe("airQualityQuerySchema", () => {
	it("accepts valid numeric coordinates", () => {
		const parsed = airQualityQuerySchema.parse({ lat: 28.6139, lon: 77.209 });
		expect(parsed.lat).toBe(28.6139);
		expect(parsed.lon).toBe(77.209);
	});

	it("coerces string coordinates into numbers", () => {
		const parsed = airQualityQuerySchema.parse({ lat: "51.5074", lon: "-0.1278" });
		expect(parsed.lat).toBe(51.5074);
		expect(parsed.lon).toBe(-0.1278);
	});

	it("rejects latitude out of range (> 90 or < -90)", () => {
		expect(() => airQualityQuerySchema.parse({ lat: 91, lon: 0 })).toThrow();
		expect(() => airQualityQuerySchema.parse({ lat: -95, lon: 0 })).toThrow();
	});

	it("rejects longitude out of range (> 180 or < -180)", () => {
		expect(() => airQualityQuerySchema.parse({ lat: 0, lon: 185 })).toThrow();
		expect(() => airQualityQuerySchema.parse({ lat: 0, lon: -190 })).toThrow();
	});

	it("rejects non-numeric string coordinates", () => {
		expect(() => airQualityQuerySchema.parse({ lat: "abc", lon: "def" })).toThrow();
	});
});

describe("householdProfileSchema", () => {
	it("populates default values when given an empty object", () => {
		const profile = householdProfileSchema.parse({});
		expect(profile.childrenUnder12).toBe(0);
		expect(profile.adultsOver65).toBe(0);
		expect(profile.pregnant).toBe(false);
		expect(profile.respiratoryCondition).toBe(false);
		expect(profile.commuteMode).toBe("car_solo");
		expect(profile.commuteDistanceKm).toBe(8);
		expect(profile.cookingFuel).toBe("lpg");
		expect(profile.heating).toBe("none");
		expect(profile.hasAirPurifier).toBe(false);
		expect(profile.homeType).toBe("apartment");
	});

	it("validates full custom profile", () => {
		const custom = {
			childrenUnder12: 3,
			adultsOver65: 2,
			pregnant: true,
			respiratoryCondition: true,
			outdoorWorker: true,
			commuteMode: "metro",
			commuteDistanceKm: 25,
			cookingFuel: "induction",
			heating: "electric",
			hasAirPurifier: true,
			hasN95Masks: true,
			homeType: "detached",
			smokerInHouse: false,
		};
		const profile = householdProfileSchema.parse(custom);
		expect(profile.childrenUnder12).toBe(3);
		expect(profile.commuteMode).toBe("metro");
	});

	it("rejects negative member counts", () => {
		expect(() => householdProfileSchema.parse({ childrenUnder12: -1 })).toThrow();
		expect(() => householdProfileSchema.parse({ adultsOver65: -2 })).toThrow();
	});

	it("rejects invalid enum values for commute, cooking, heating, homeType", () => {
		expect(() => householdProfileSchema.parse({ commuteMode: "rocket" })).toThrow();
		expect(() => householdProfileSchema.parse({ cookingFuel: "nuclear" })).toThrow();
		expect(() => householdProfileSchema.parse({ heating: "lava" })).toThrow();
		expect(() => householdProfileSchema.parse({ homeType: "igloo" })).toThrow();
	});
});

describe("chatMessageSchema", () => {
	it("accepts valid user and assistant messages", () => {
		const userMsg = chatMessageSchema.parse({ role: "user", content: "Hello air assistant" });
		expect(userMsg.role).toBe("user");

		const asstMsg = chatMessageSchema.parse({ role: "assistant", content: "Air is moderate" });
		expect(asstMsg.role).toBe("assistant");
	});

	it("rejects invalid role or empty content", () => {
		expect(() => chatMessageSchema.parse({ role: "system", content: "Prompt" })).toThrow();
		expect(() => chatMessageSchema.parse({ role: "user", content: "   " })).toThrow();
	});
});

describe("briefingRequestSchema & chatRequestSchema", () => {
	it("validates briefingRequest payload", () => {
		const valid = {
			profile: DEFAULT_PROFILE,
			locationName: "New Delhi",
			currentAqi: 220,
			pm25: 170.5,
			bestWindow: {
				startHour: "13:00",
				endHour: "15:00",
				averageAqi: 135,
				recommendation: "Cautious window",
			},
			topHacks: ["DIY Box Fan", "Wet Mopping"],
			language: "hi",
		};
		const parsed = briefingRequestSchema.parse(valid);
		expect(parsed.locationName).toBe("New Delhi");
		expect(parsed.language).toBe("hi");
	});

	it("validates chatRequest payload and defaults language to en", () => {
		const valid = {
			question: "Should my kids play outside today?",
			profile: DEFAULT_PROFILE,
			locationName: "New Delhi",
			currentAqi: 220,
			pm25: 170.5,
			bestWindow: {
				startHour: "13:00",
				endHour: "15:00",
				averageAqi: 135,
				recommendation: "Cautious window",
			},
		};
		const parsed = chatRequestSchema.parse(valid);
		expect(parsed.question).toBe("Should my kids play outside today?");
		expect(parsed.language).toBe("en");
		expect(parsed.history).toEqual([]);
	});

	it("rejects empty or oversized questions in chatRequest", () => {
		expect(() =>
			chatRequestSchema.parse({
				question: "",
				profile: DEFAULT_PROFILE,
				locationName: "New Delhi",
				currentAqi: 220,
				pm25: 170.5,
				bestWindow: MOCK_PLAN.bestWindow,
			}),
		).toThrow();

		const longQuestion = "a".repeat(450);
		expect(() =>
			chatRequestSchema.parse({
				question: longQuestion,
				profile: DEFAULT_PROFILE,
				locationName: "New Delhi",
				currentAqi: 220,
				pm25: 170.5,
				bestWindow: MOCK_PLAN.bestWindow,
			}),
		).toThrow();
	});
});

describe("cleanAirPlanSchema", () => {
	it("accepts a complete computed plan for grounded narration", () => {
		expect(cleanAirPlanSchema.parse(MOCK_PLAN)).toMatchObject({
			currentAqi: MOCK_PLAN.currentAqi,
			location: { name: "New Delhi" },
		});
	});

	it("rejects an incomplete or non-finite plan context", () => {
		expect(() => cleanAirPlanSchema.parse({})).toThrow();
		expect(() => cleanAirPlanSchema.parse({ ...MOCK_PLAN, currentAqi: Number.NaN })).toThrow();
	});
});
