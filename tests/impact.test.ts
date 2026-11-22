/**
 * Unit tests for Sustainable Alternatives, Emission Formulas, and Personal Exposure Reduction.
 */

import { describe, expect, it } from "vitest";
import {
	calculateCommuteAlternative,
	calculateCookingAlternative,
	calculateExposureImpact,
	calculateHeatingAlternative,
	COMMUTE_DAYS_PER_WEEK,
	EMISSION_CAR_CO2_KG_PER_KM,
	EMISSION_CAR_PM25_G_PER_KM,
	EMISSION_METRO_CO2_KG_PER_KM,
	EMISSION_METRO_PM25_G_PER_KM,
	INFILTRATION_SEALED_WINDOWS,
	INFILTRATION_UNSEALED,
	INFILTRATION_WITH_DIY_FILTER,
	INFILTRATION_WITH_HEPA,
	RESPIRATOR_N95_TRANSMISSION,
} from "@/lib/impact";
import { DEFAULT_PROFILE } from "@/lib/profile";
import type { HouseholdProfile } from "@/lib/types";
import { TEST_PROFILE_HEALTHY, TEST_PROFILE_SENSITIVE } from "./helpers";

describe("Commute Alternatives & Avoided Emissions", () => {
	it("quantifies solo car commute to metro shift accurately", () => {
		const roundTripKm = 10;
		const weeklyKm = roundTripKm * COMMUTE_DAYS_PER_WEEK; // 50 km
		const alt = calculateCommuteAlternative("car_solo", roundTripKm);

		expect(alt).not.toBeNull();
		expect(alt?.id).toBe("commute-shift-metro");
		expect(alt?.proposedOption).toContain("Metro");

		// CO2 avoided = 50 * (0.171 - 0.033) = 50 * 0.138 = 6.9 kg
		const expectedCo2 = Math.round(weeklyKm * (EMISSION_CAR_CO2_KG_PER_KM - EMISSION_METRO_CO2_KG_PER_KM) * 10) / 10;
		expect(alt?.co2AvoidedKgWeekly).toBe(expectedCo2);

		// PM2.5 avoided = 50 * (0.028 - 0.002) = 50 * 0.026 = 1.3 g
		const expectedPm = Math.round(weeklyKm * (EMISSION_CAR_PM25_G_PER_KM - EMISSION_METRO_PM25_G_PER_KM) * 10) / 10;
		expect(alt?.pm25AvoidedGramsWeekly).toBe(expectedPm);
		expect(alt?.scientificBasis).toContain("FTA National Transit Database");
	});

	it("quantifies motorbike to public bus shift", () => {
		const alt = calculateCommuteAlternative("motorbike", 12);
		expect(alt).not.toBeNull();
		expect(alt?.id).toBe("commute-shift-bus");
		expect(alt?.co2AvoidedKgWeekly).toBeGreaterThan(0);
		expect(alt?.pm25AvoidedGramsWeekly).toBeGreaterThan(0);
		expect(alt?.rationale).toContain("tailpipe plumes");
		expect(alt?.scientificBasis).toContain("ICCT");
	});

	it("optimizes shared carpool with metro transit", () => {
		const alt = calculateCommuteAlternative("carpool", 20);
		expect(alt).not.toBeNull();
		expect(alt?.id).toBe("commute-optimize-carpool");
		expect(alt?.co2AvoidedKgWeekly).toBeGreaterThan(0);
	});

	it("recognizes active walking and cycling as zero-emission", () => {
		const walkAlt = calculateCommuteAlternative("walk", 3);
		expect(walkAlt?.co2AvoidedKgWeekly).toBe(0);
		expect(walkAlt?.pm25AvoidedGramsWeekly).toBe(0);
		expect(walkAlt?.rationale).toContain("already produces zero exhaust");

		const bikeAlt = calculateCommuteAlternative("bicycle", 8);
		expect(bikeAlt?.co2AvoidedKgWeekly).toBe(0);
		expect(bikeAlt?.rationale).toContain("zero exhaust");
	});

	it("handles minimum 1 km clamp for zero or negative commute distances", () => {
		const alt = calculateCommuteAlternative("car_solo", 0);
		expect(alt).not.toBeNull();
		expect(alt?.co2AvoidedKgWeekly).toBeGreaterThan(0);
	});
});

describe("Cooking Clean Fuel Alternatives", () => {
	it("quantifies transition from solid biomass to electric induction", () => {
		const alt = calculateCookingAlternative("biomass");
		expect(alt).not.toBeNull();
		expect(alt?.id).toBe("cooking-biomass-to-clean");
		expect(alt?.indoorPm25ReductionPct).toBeGreaterThanOrEqual(90);
		expect(alt?.co2AvoidedKgWeekly).toBe(14.5);
		expect(alt?.pm25AvoidedGramsWeekly).toBe(110.0);
		expect(alt?.scientificBasis).toContain("WHO Guidelines for Indoor Air Quality");
	});

	it("quantifies transition from LPG gas cooking to induction", () => {
		const alt = calculateCookingAlternative("lpg");
		expect(alt).not.toBeNull();
		expect(alt?.id).toBe("cooking-lpg-to-induction");
		expect(alt?.indoorPm25ReductionPct).toBeGreaterThanOrEqual(80);
		expect(alt?.rationale).toContain("nitrogen dioxide (NO2)");
		expect(alt?.scientificBasis).toContain("Rocky Mountain Institute");
	});

	it("returns null when already using clean induction or electric cooktops", () => {
		expect(calculateCookingAlternative("induction")).toBeNull();
		expect(calculateCookingAlternative("electric")).toBeNull();
	});
});

describe("Space Heating Alternatives", () => {
	it("quantifies replacing firewood burning with electric heating", () => {
		const alt = calculateHeatingAlternative("wood");
		expect(alt).not.toBeNull();
		expect(alt?.id).toBe("heating-solid-to-electric");
		expect(alt?.currentOption).toContain("Firewood");
		expect(alt?.pm25AvoidedGramsWeekly).toBeGreaterThan(1000);
		expect(alt?.scientificBasis).toContain("EPA Burn Wise");
	});

	it("quantifies replacing coal space heating brazier with electric heating", () => {
		const alt = calculateHeatingAlternative("coal");
		expect(alt).not.toBeNull();
		expect(alt?.currentOption).toContain("Coal Briquette");
		expect(alt?.pm25AvoidedGramsWeekly).toBeGreaterThan(1500);
		expect(alt?.co2AvoidedKgWeekly).toBe(38.5);
	});

	it("returns null when heating is none, gas, or already electric", () => {
		expect(calculateHeatingAlternative("none")).toBeNull();
		expect(calculateHeatingAlternative("electric")).toBeNull();
		expect(calculateHeatingAlternative("gas")).toBeNull();
	});
});

describe("Personal Exposure Impact Calculation", () => {
	it("verifies physical constants conform to peer-reviewed benchmarks", () => {
		expect(INFILTRATION_UNSEALED).toBe(0.72);
		expect(INFILTRATION_SEALED_WINDOWS).toBe(0.42);
		expect(INFILTRATION_WITH_HEPA).toBe(0.16);
		expect(INFILTRATION_WITH_DIY_FILTER).toBe(0.24);
		expect(RESPIRATOR_N95_TRANSMISSION).toBe(0.05);
	});

	it("calculates substantial reduction for homes with air purifiers in severe smog", () => {
		const profileWithPurifier: HouseholdProfile = {
			...DEFAULT_PROFILE,
			hasAirPurifier: true,
		};
		const impact = calculateExposureImpact(profileWithPurifier, 200);

		expect(impact.baselineInhaledPm25UgDay).toBeGreaterThan(impact.optimizedInhaledPm25UgDay);
		expect(impact.netReductionPct).toBeGreaterThanOrEqual(70);
		expect(impact.factors.length).toBe(4);
		expect(impact.factors[0]?.intervention).toContain("Continuous HEPA");
	});

	it("calculates reduction for homes without air purifiers using DIY box fan hack", () => {
		const profileNoPurifier: HouseholdProfile = {
			...DEFAULT_PROFILE,
			hasAirPurifier: false,
		};
		const impact = calculateExposureImpact(profileNoPurifier, 200);

		expect(impact.netReductionPct).toBeGreaterThanOrEqual(60);
		expect(impact.factors[0]?.intervention).toContain("DIY Box Fan");
	});

	it("handles clean ambient air (5 µg/m³) with realistic baseline bounds", () => {
		const impact = calculateExposureImpact(TEST_PROFILE_HEALTHY, 5);
		expect(impact.baselineInhaledPm25UgDay).toBeGreaterThan(0);
		expect(impact.optimizedInhaledPm25UgDay).toBeGreaterThan(0);
		expect(impact.netReductionPct).toBeLessThanOrEqual(95);
	});

	it("handles high particulate smog (350 µg/m³) without overflow or NaN", () => {
		const impact = calculateExposureImpact(TEST_PROFILE_SENSITIVE, 350);
		expect(Number.isFinite(impact.baselineInhaledPm25UgDay)).toBe(true);
		expect(Number.isFinite(impact.optimizedInhaledPm25UgDay)).toBe(true);
		expect(impact.netReductionPct).toBeGreaterThanOrEqual(60);
		expect(impact.netReductionPct).toBeLessThanOrEqual(95);
	});

	it("uses a safe baseline when ambient PM2.5 is missing or non-finite", () => {
		const impact = calculateExposureImpact(TEST_PROFILE_HEALTHY, Number.NaN);
		expect(impact.baselineInhaledPm25UgDay).toBeGreaterThan(0);
		expect(Number.isFinite(impact.optimizedInhaledPm25UgDay)).toBe(true);
	});
});
