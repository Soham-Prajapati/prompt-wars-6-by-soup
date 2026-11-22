/**
 * Integration tests for the Deterministic Decision Engine Orchestrator.
 */

import { describe, expect, it } from "vitest";
import { buildCleanAirPlan } from "@/lib/decision-engine";
import { DEFAULT_PROFILE } from "@/lib/profile";
import type { HourlyForecastPoint, PollutantBreakdown } from "@/lib/types";
import {
	TEST_LOCATION,
	TEST_POLLUTANTS_GOOD,
	TEST_POLLUTANTS_SEVERE,
	TEST_PROFILE_HEALTHY,
	TEST_PROFILE_SENSITIVE,
} from "./helpers";

function generateMockForecast(peakAqi: number): HourlyForecastPoint[] {
	const points: HourlyForecastPoint[] = [];
	for (let h = 0; h < 24; h++) {
		const hourLabel = `${String(h).padStart(2, "0")}:00`;
		const aqi = h >= 12 && h <= 14 ? Math.round(peakAqi * 0.4) : peakAqi;
		points.push({
			timestamp: `2026-11-22T${hourLabel}:00Z`,
			hourLabel,
			usAqi: aqi,
			pm25: aqi * 0.7,
			pm10: aqi * 1.2,
			no2: 30,
			o3: 25,
			co: 300,
			bandCode: aqi > 200 ? "very_unhealthy" : aqi > 100 ? "unhealthy_sensitive" : "moderate",
			bandLabel: aqi > 200 ? "Very Unhealthy" : aqi > 100 ? "Sensitive" : "Moderate",
			isBestWindow: false,
		});
	}
	return points;
}

describe("buildCleanAirPlan Orchestrator", () => {
	it("assembles complete, coherent CleanAirPlan during severe winter smog", () => {
		const forecast = generateMockForecast(240);
		const plan = buildCleanAirPlan(
			TEST_LOCATION,
			TEST_PROFILE_SENSITIVE,
			TEST_POLLUTANTS_SEVERE,
			forecast,
		);

		// 1. Location & Pollutants
		expect(plan.location.name).toBe("New Delhi");
		expect(plan.currentAqi).toBe(245);
		expect(plan.currentBand.code).toBe("very_unhealthy");
		expect(plan.dominantPollutant.name).toBe("PM2.5");

		// 2. Best Window & 24h Strip
		expect(plan.bestWindow).toBeDefined();
		expect(plan.bestWindow.startHour).toBe("12:00");
		expect(plan.forecast24h.length).toBe(24);
		expect(plan.forecast24h.some((p) => p.isBestWindow)).toBe(true);

		// 3. Member Risks
		expect(plan.memberRisks.length).toBe(5);
		expect(plan.memberRisks.some((r) => r.riskTier === "critical")).toBe(true);

		// 4. Daily Routine
		expect(plan.dailyRoutine.length).toBe(5);
		expect(plan.dailyRoutine[0]?.outdoorActivityAllowed).toBe(false);

		// 5. Ranked Hacks
		expect(plan.rankedHacks.length).toBe(8);
		expect(plan.rankedHacks[0]?.id).toBe("diy-corsi-rosenthal");

		// 6. Sustainable Alternatives
		expect(plan.alternatives.length).toBe(3); // commute, cooking, heating
		expect(plan.alternatives.map((a) => a.category)).toEqual([
			"commute",
			"cooking",
			"heating",
		]);

		// 7. Exposure Impact
		expect(plan.exposureImpact.baselineInhaledPm25UgDay).toBeGreaterThan(0);
		expect(plan.exposureImpact.optimizedInhaledPm25UgDay).toBeLessThan(
			plan.exposureImpact.baselineInhaledPm25UgDay,
		);
		expect(plan.exposureImpact.netReductionPct).toBeGreaterThanOrEqual(60);
		expect(plan.computedAt).toBeDefined();
	});

	it("assembles complete plan under clean air conditions", () => {
		const forecast = generateMockForecast(40);
		const plan = buildCleanAirPlan(
			TEST_LOCATION,
			TEST_PROFILE_HEALTHY,
			TEST_POLLUTANTS_GOOD,
			forecast,
		);

		expect(plan.currentAqi).toBe(35);
		expect(plan.currentBand.code).toBe("good");
		expect(plan.memberRisks[0]?.riskTier).toBe("low");
		expect(plan.dailyRoutine[0]?.outdoorActivityAllowed).toBe(true);
	});

	it("handles empty forecast arrays safely via fallback window", () => {
		const emptyForecast: HourlyForecastPoint[] = [];
		const plan = buildCleanAirPlan(
			TEST_LOCATION,
			DEFAULT_PROFILE,
			TEST_POLLUTANTS_GOOD,
			emptyForecast,
		);

		expect(plan.bestWindow).toBeDefined();
		expect(plan.forecast24h.length).toBe(0);
		expect(plan.dailyRoutine.length).toBe(5);
	});

	it("handles edge case pollutant readings (AQI 0, PM2.5 0)", () => {
		const zeroPollutants: PollutantBreakdown = {
			usAqi: 0,
			pm25: 0,
			pm10: 0,
			no2: 0,
			o3: 0,
			co: 0,
		};
		const plan = buildCleanAirPlan(
			TEST_LOCATION,
			DEFAULT_PROFILE,
			zeroPollutants,
			[],
		);

		expect(plan.currentAqi).toBe(0);
		expect(plan.currentBand.code).toBe("good");
		expect(plan.exposureImpact.netReductionPct).toBeGreaterThan(0);
	});
});
