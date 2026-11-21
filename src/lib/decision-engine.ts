/**
 * Deterministic Decision Engine Orchestrator for ClearAir.
 *
 * Integrates all pure mathematical domain modules (EPA AQI bands, member vulnerabilities,
 * 48-hour forecast analysis, best outdoor window identification, low-emission daily routine,
 * ranked indoor air hacks, sustainable alternatives with carbon/PM reductions, and personal
 * exposure mitigation factors).
 *
 * This engine runs completely without GenAI. The GenAI layer only translates and narrates
 * the facts produced here.
 */

import { getAqiBand, identifyDominantPollutant } from "@/lib/aqi";
import {
	build24HourForecastStrip,
	findBestOutdoorWindow,
} from "@/lib/forecast";
import { rankIndoorHacks } from "@/lib/hacks";
import {
	calculateCommuteAlternative,
	calculateCookingAlternative,
	calculateExposureImpact,
	calculateHeatingAlternative,
} from "@/lib/impact";
import { evaluateHouseholdRisks } from "@/lib/profile";
import { generateDailyRoutine } from "@/lib/routine";
import type {
	CleanAirPlan,
	GeoLocation,
	HourlyForecastPoint,
	HouseholdProfile,
	PollutantBreakdown,
	SustainableAlternative,
} from "@/lib/types";

/**
 * Generate a complete, fully computed CleanAirPlan.
 *
 * @param location Geographic location metadata.
 * @param profile Family household parameters.
 * @param pollutants Current measured pollutant concentrations.
 * @param hourly 48-hour hourly forecast points.
 * @returns CleanAirPlan containing all computed facts, routines, hacks, and metrics.
 */
export function buildCleanAirPlan(
	location: GeoLocation,
	profile: HouseholdProfile,
	pollutants: PollutantBreakdown,
	hourly: readonly HourlyForecastPoint[],
): CleanAirPlan {
	const currentAqi = pollutants.usAqi;
	const currentBand = getAqiBand(currentAqi);
	const dominantPollutant = identifyDominantPollutant(pollutants);

	// 1. Forecast & Best Window
	const bestWindow = findBestOutdoorWindow(hourly, 2, 24);
	const forecast24h = build24HourForecastStrip(hourly, bestWindow);

	// 2. Household Vulnerabilities & Precautions
	const memberRisks = evaluateHouseholdRisks(profile, currentBand.code);

	// 3. Timed Low-Emission Daily Routine
	const dailyRoutine = generateDailyRoutine(profile, currentAqi, bestWindow);

	// 4. Ranked Indoor Air Hacks
	const rankedHacks = rankIndoorHacks(profile, currentAqi);

	// 5. Sustainable Alternatives with Quantified Reductions
	const alternatives: SustainableAlternative[] = [];

	const commuteAlt = calculateCommuteAlternative(
		profile.commuteMode,
		profile.commuteDistanceKm,
	);
	if (commuteAlt !== null) {
		alternatives.push(commuteAlt);
	}

	const cookingAlt = calculateCookingAlternative(profile.cookingFuel);
	if (cookingAlt !== null) {
		alternatives.push(cookingAlt);
	}

	const heatingAlt = calculateHeatingAlternative(profile.heating);
	if (heatingAlt !== null) {
		alternatives.push(heatingAlt);
	}

	// 6. Direct Exposure Impact Reduction
	const exposureImpact = calculateExposureImpact(profile, pollutants.pm25);

	return {
		location,
		currentAqi,
		currentBand,
		dominantPollutant,
		pollutants,
		bestWindow,
		forecast24h,
		memberRisks,
		dailyRoutine,
		rankedHacks,
		alternatives,
		exposureImpact,
		computedAt: new Date().toISOString(),
	};
}
