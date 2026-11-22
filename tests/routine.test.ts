/**
 * Unit tests for Low-Emission Daily Routine Scheduling.
 */

import { describe, expect, it } from "vitest";
import { generateDailyRoutine } from "@/lib/routine";
import type { BestOutdoorWindow, HouseholdProfile } from "@/lib/types";
import { DEFAULT_PROFILE } from "@/lib/profile";
import { TEST_PROFILE_HEALTHY, TEST_PROFILE_SENSITIVE } from "./helpers";

const MOCK_BEST_WINDOW: BestOutdoorWindow = {
	startHour: "12:00",
	endHour: "14:00",
	durationHours: 2,
	averageAqi: 85,
	minAqi: 75,
	averagePm25: 28.4,
	recommendation: "Acceptable window for essential outdoor tasks.",
};

describe("generateDailyRoutine", () => {
	it("generates exactly 5 chronological daily segments spanning 24 hours", () => {
		const routine = generateDailyRoutine(DEFAULT_PROFILE, 180, MOCK_BEST_WINDOW);
		expect(routine.length).toBe(5);
		expect(routine.map((s) => s.id)).toEqual([
			"routine-morning-inversion",
			"routine-midday-window",
			"routine-afternoon-rest",
			"routine-evening-rush",
			"routine-night-sanctuary",
		]);
	});

	it("forbids outdoor morning exertion and enforces lockdown during high smog (AQI > 150)", () => {
		const routine = generateDailyRoutine(DEFAULT_PROFILE, 180, MOCK_BEST_WINDOW);
		const morning = routine.find((s) => s.id === "routine-morning-inversion");
		expect(morning).toBeDefined();
		expect(morning?.outdoorActivityAllowed).toBe(false);
		expect(morning?.ventilationAdvice).toContain("Lockdown");
		expect(morning?.actionDescription).toContain("winter radiation inversion");
	});

	it("permits moderate outdoor morning exertion when air is Good or Moderate (AQI <= 150)", () => {
		const routine = generateDailyRoutine(DEFAULT_PROFILE, 65, MOCK_BEST_WINDOW);
		const morning = routine.find((s) => s.id === "routine-morning-inversion");
		expect(morning?.outdoorActivityAllowed).toBe(true);
		expect(morning?.actionDescription).toContain("Moderate air quality");
	});

	it("aligns midday outdoor window strictly to the computed best window", () => {
		const routine = generateDailyRoutine(DEFAULT_PROFILE, 190, MOCK_BEST_WINDOW);
		const midday = routine.find((s) => s.id === "routine-midday-window");
		expect(midday).toBeDefined();
		expect(midday?.timeSpan).toBe("12:00 – 14:00");
		expect(midday?.outdoorActivityAllowed).toBe(true);
		expect(midday?.actionDescription).toContain("12:00 to 14:00");
		expect(midday?.actionDescription).toContain("85");
	});

	it("recommends 15-minute cross ventilation flush when best window AQI <= 100", () => {
		const cleanWindow: BestOutdoorWindow = {
			...MOCK_BEST_WINDOW,
			averageAqi: 65,
		};
		const routine = generateDailyRoutine(DEFAULT_PROFILE, 160, cleanWindow);
		const midday = routine.find((s) => s.id === "routine-midday-window");
		expect(midday?.ventilationAdvice).toContain("15-minute whole-house cross ventilation flush");
	});

	it("recommends restricted ventilation when even the best window AQI > 100", () => {
		const dirtyWindow: BestOutdoorWindow = {
			...MOCK_BEST_WINDOW,
			averageAqi: 145,
		};
		const routine = generateDailyRoutine(DEFAULT_PROFILE, 220, dirtyWindow);
		const midday = routine.find((s) => s.id === "routine-midday-window");
		expect(midday?.ventilationAdvice).toContain("rely entirely on recirculating filtered indoor air");
	});

	it("instructs kitchen exhaust operation and evening traffic avoidance", () => {
		const routine = generateDailyRoutine(DEFAULT_PROFILE, 175, MOCK_BEST_WINDOW);
		const evening = routine.find((s) => s.id === "routine-evening-rush");
		expect(evening?.actionDescription).toContain("kitchen exhaust");
		expect(evening?.actionDescription).toContain("damp-mop");
		expect(evening?.outdoorActivityAllowed).toBe(false);
	});

	it("configures night sanctuary for homes with HEPA purifier", () => {
		const profilePurifier: HouseholdProfile = {
			...DEFAULT_PROFILE,
			hasAirPurifier: true,
		};
		const routine = generateDailyRoutine(profilePurifier, 190, MOCK_BEST_WINDOW);
		const night = routine.find((s) => s.id === "routine-night-sanctuary");
		expect(night?.actionDescription).toContain("bedroom air purifier on quiet night mode");
	});

	it("configures night sanctuary with DIY box fan for homes without commercial purifiers", () => {
		const profileNoPurifier: HouseholdProfile = {
			...DEFAULT_PROFILE,
			hasAirPurifier: false,
		};
		const routine = generateDailyRoutine(profileNoPurifier, 190, MOCK_BEST_WINDOW);
		const night = routine.find((s) => s.id === "routine-night-sanctuary");
		expect(night?.actionDescription).toContain("DIY box-fan filter in the primary bedroom");
	});

	it("tags sensitive members explicitly in morning and afternoon segments", () => {
		const routine = generateDailyRoutine(TEST_PROFILE_SENSITIVE, 220, MOCK_BEST_WINDOW);
		const morning = routine.find((s) => s.id === "routine-morning-inversion");
		expect(morning?.targetedMembers).toEqual(
			expect.arrayContaining([
				"Children under 12",
				"Adults over 65",
				"Asthma / Respiratory",
				"Pregnant members",
			]),
		);
	});

	it("defaults targeted members to entire household when profile is healthy", () => {
		const routine = generateDailyRoutine(TEST_PROFILE_HEALTHY, 70, MOCK_BEST_WINDOW);
		const morning = routine.find((s) => s.id === "routine-morning-inversion");
		expect(morning?.targetedMembers).toEqual(["Entire household"]);
	});
});
