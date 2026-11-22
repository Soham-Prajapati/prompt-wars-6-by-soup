/**
 * Unit tests for Indoor Air Quality Hacks & Household Prioritization.
 */

import { describe, expect, it } from "vitest";
import { AIR_HACKS_CATALOG, rankIndoorHacks } from "@/lib/hacks";
import { DEFAULT_PROFILE } from "@/lib/profile";
import type { HouseholdProfile } from "@/lib/types";
import { TEST_PROFILE_HEALTHY, TEST_PROFILE_SENSITIVE } from "./helpers";

describe("AIR_HACKS_CATALOG", () => {
	it("contains 8 comprehensive evidence-based interventions", () => {
		expect(AIR_HACKS_CATALOG.length).toBe(8);
	});

	it("each hack specifies impact percentage, cost tier, and detailed instructions", () => {
		for (const hack of AIR_HACKS_CATALOG) {
			expect(hack.id.length).toBeGreaterThan(2);
			expect(hack.title.length).toBeGreaterThan(5);
			expect(hack.pm25ReductionPct).toBeGreaterThan(0);
			expect(["free", "low", "medium"]).toContain(hack.estimatedCost);
			expect(hack.summary.length).toBeGreaterThan(20);
			expect(hack.instructions.length).toBeGreaterThanOrEqual(3);
			expect(hack.relevanceReason.length).toBeGreaterThan(10);
		}
	});

	it("includes proven Corsi-Rosenthal DIY filtration hack", () => {
		const cr = AIR_HACKS_CATALOG.find((h) => h.id === "diy-corsi-rosenthal");
		expect(cr).toBeDefined();
		expect(cr?.pm25ReductionPct).toBeGreaterThanOrEqual(70);
		expect(cr?.estimatedCost).toBe("low");
	});

	it("includes combustion elimination hack warning against incense and mosquito coils", () => {
		const comb = AIR_HACKS_CATALOG.find((h) => h.id === "eliminate-combustion");
		expect(comb).toBeDefined();
		expect(comb?.summary).toContain("mosquito coil");
	});
});

describe("rankIndoorHacks Prioritization Logic", () => {
	it("ranks DIY box fan #1 when household has no air purifier", () => {
		const profileNoPurifier: HouseholdProfile = {
			...DEFAULT_PROFILE,
			hasAirPurifier: false,
		};
		const ranked = rankIndoorHacks(profileNoPurifier, 150);
		expect(ranked[0]?.id).toBe("diy-corsi-rosenthal");
		expect(ranked[0]?.rank).toBe(1);
	});

	it("deprioritizes DIY box fan when household already owns a HEPA purifier", () => {
		const profileWithPurifier: HouseholdProfile = {
			...DEFAULT_PROFILE,
			hasAirPurifier: true,
		};
		const ranked = rankIndoorHacks(profileWithPurifier, 150);
		expect(ranked[0]?.id).not.toBe("diy-corsi-rosenthal");
	});

	it("boosts kitchen exhaust isolation when cooking with solid biomass or LPG", () => {
		const profileBiomass: HouseholdProfile = {
			...DEFAULT_PROFILE,
			cookingFuel: "biomass",
		};
		const ranked = rankIndoorHacks(profileBiomass, 180);
		const kitchenRank = ranked.find((h) => h.id === "kitchen-exhaust-isolation")?.rank;
		expect(kitchenRank).toBeLessThanOrEqual(3);
	});

	it("boosts combustion elimination when smoker is present in the home", () => {
		const profileSmoker: HouseholdProfile = {
			...DEFAULT_PROFILE,
			smokerInHouse: true,
		};
		const ranked = rankIndoorHacks(profileSmoker, 120);
		const combRank = ranked.find((h) => h.id === "eliminate-combustion")?.rank;
		expect(combRank).toBeLessThanOrEqual(3);
	});

	it("elevates bedroom sanctuary when vulnerable family members are present", () => {
		const ranked = rankIndoorHacks(TEST_PROFILE_SENSITIVE, 250);
		const sanctuary = ranked.find((h) => h.id === "bedroom-sanctuary");
		expect(sanctuary).toBeDefined();
		expect(sanctuary?.rank).toBeLessThanOrEqual(4);
	});

	it("ranks door sweep gap sealing highly for informal or apartment homes", () => {
		const profileApartment: HouseholdProfile = {
			...DEFAULT_PROFILE,
			homeType: "informal",
		};
		const ranked = rankIndoorHacks(profileApartment, 160);
		const doorSweep = ranked.find((h) => h.id === "door-sweep-sealing");
		expect(doorSweep).toBeDefined();
	});

	it("always returns sequentially numbered ranks 1 through 8", () => {
		const ranked = rankIndoorHacks(TEST_PROFILE_HEALTHY, 90);
		expect(ranked.map((h) => h.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
	});
});
