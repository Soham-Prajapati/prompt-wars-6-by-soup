/**
 * EPA Air Quality Index (AQI) calculations and standard breakpoints.
 *
 * Implements the mathematical formulas and concentration breakpoints defined by
 * the United States Environmental Protection Agency in 40 CFR Part 58, Appendix G
 * (Uniform Air Quality Index and Reporting).
 *
 * Each band pairs textual descriptions and explicit icons with color tokens so that
 * air quality is never communicated via color alone (WCAG 1.4.1 compliance).
 */

import type { AqiBand, AqiBandCode, PollutantBreakdown } from "@/lib/types";

/**
 * Standard EPA AQI Bands.
 *
 * Defined according to EPA-454/B-18-007 (Technical Assistance Document for the
 * Reporting of Daily Air Quality).
 */
export const AQI_BANDS: Readonly<Record<AqiBandCode, AqiBand>> = {
	good: {
		code: "good",
		label: "Good",
		minAqi: 0,
		maxAqi: 50,
		severity: "safe",
		description: "Air quality is satisfactory, and air pollution poses little or no risk.",
		icon: "🌱",
	},
	moderate: {
		code: "moderate",
		label: "Moderate",
		minAqi: 51,
		maxAqi: 100,
		severity: "caution",
		description:
			"Air quality is acceptable. However, unusually sensitive individuals may experience minor symptoms.",
		icon: "⚠️",
	},
	unhealthy_sensitive: {
		code: "unhealthy_sensitive",
		label: "Unhealthy for Sensitive Groups",
		minAqi: 101,
		maxAqi: 150,
		severity: "warning",
		description:
			"Members of sensitive groups (children, elderly, asthma/heart conditions) may experience health effects.",
		icon: "🛡️",
	},
	unhealthy: {
		code: "unhealthy",
		label: "Unhealthy",
		minAqi: 151,
		maxAqi: 200,
		severity: "danger",
		description:
			"Everyone may begin to experience health effects; members of sensitive groups may experience serious effects.",
		icon: "🛑",
	},
	very_unhealthy: {
		code: "very_unhealthy",
		label: "Very Unhealthy",
		minAqi: 201,
		maxAqi: 300,
		severity: "critical",
		description:
			"Health alert: The risk of health effects is significantly increased for the entire population.",
		icon: "🚨",
	},
	hazardous: {
		code: "hazardous",
		label: "Hazardous",
		minAqi: 301,
		maxAqi: 500,
		severity: "critical",
		description:
			"Health warning of emergency conditions: Everyone is more likely to be affected by severe respiratory distress.",
		icon: "☣️",
	},
};

/**
 * Resolve the EPA AQI band for any numerical AQI value.
 * Clamps input between 0 and 500+.
 *
 * @param aqi Numerical US AQI index (0 to 500+).
 * @returns The matching AqiBand structure.
 */
export function getAqiBand(aqi: number): AqiBand {
	const sanitized = Number.isFinite(aqi) ? Math.max(0, Math.round(aqi)) : 0;

	if (sanitized <= 50) return AQI_BANDS.good;
	if (sanitized <= 100) return AQI_BANDS.moderate;
	if (sanitized <= 150) return AQI_BANDS.unhealthy_sensitive;
	if (sanitized <= 200) return AQI_BANDS.unhealthy;
	if (sanitized <= 300) return AQI_BANDS.very_unhealthy;
	return AQI_BANDS.hazardous;
}

/**
 * Breakpoint table entry for EPA linear interpolation formula:
 * I = ((I_hi - I_lo) / (C_hi - C_lo)) * (C - C_lo) + I_lo
 */
interface Breakpoint {
	readonly cLo: number;
	readonly cHi: number;
	readonly iLo: number;
	readonly iHi: number;
}

/**
 * PM2.5 24-hour concentration breakpoints in µg/m³ (EPA revised 2024 standards).
 */
const PM25_BREAKPOINTS: readonly Breakpoint[] = [
	{ cLo: 0.0, cHi: 9.0, iLo: 0, iHi: 50 },
	{ cLo: 9.1, cHi: 35.4, iLo: 51, iHi: 100 },
	{ cLo: 35.5, cHi: 55.4, iLo: 101, iHi: 150 },
	{ cLo: 55.5, cHi: 125.4, iLo: 151, iHi: 200 },
	{ cLo: 125.5, cHi: 225.4, iLo: 201, iHi: 300 },
	{ cLo: 225.5, cHi: 325.4, iLo: 301, iHi: 400 },
	{ cLo: 325.5, cHi: 500.4, iLo: 401, iHi: 500 },
];

/**
 * PM10 24-hour concentration breakpoints in µg/m³.
 */
const PM10_BREAKPOINTS: readonly Breakpoint[] = [
	{ cLo: 0, cHi: 54, iLo: 0, iHi: 50 },
	{ cLo: 55, cHi: 154, iLo: 51, iHi: 100 },
	{ cLo: 155, cHi: 254, iLo: 101, iHi: 150 },
	{ cLo: 255, cHi: 354, iLo: 151, iHi: 200 },
	{ cLo: 355, cHi: 424, iLo: 201, iHi: 300 },
	{ cLo: 425, cHi: 504, iLo: 301, iHi: 400 },
	{ cLo: 505, cHi: 604, iLo: 401, iHi: 500 },
];

/**
 * Linear interpolation helper for EPA piecewise linear AQI equation.
 */
function interpolateAqi(concentration: number, breakpoints: readonly Breakpoint[]): number {
	if (!Number.isFinite(concentration) || concentration <= 0) {
		return 0;
	}

	for (const bp of breakpoints) {
		if (concentration >= bp.cLo && concentration <= bp.cHi) {
			const index =
				((bp.iHi - bp.iLo) / (bp.cHi - bp.cLo)) * (concentration - bp.cLo) + bp.iLo;
			return Math.round(index);
		}
	}

	const last = breakpoints[breakpoints.length - 1];
	if (last !== undefined && concentration > last.cHi) {
		const index =
			((last.iHi - last.iLo) / (last.cHi - last.cLo)) * (concentration - last.cLo) +
			last.iLo;
		return Math.min(500, Math.round(index));
	}

	return 0;
}

/**
 * Calculate EPA US AQI from PM2.5 concentration in µg/m³.
 *
 * @param pm25 Concentration in micrograms per cubic meter.
 */
export function calculatePm25Aqi(pm25: number): number {
	const truncated = Math.floor(pm25 * 10) / 10;
	return interpolateAqi(truncated, PM25_BREAKPOINTS);
}

/**
 * Calculate EPA US AQI from PM10 concentration in µg/m³.
 *
 * @param pm10 Concentration in micrograms per cubic meter.
 */
export function calculatePm10Aqi(pm10: number): number {
	const floored = Math.floor(pm10);
	return interpolateAqi(floored, PM10_BREAKPOINTS);
}

/**
 * Identify the primary/dominant pollutant driving the air quality index.
 *
 * @param pollutants Detailed pollutant concentrations.
 */
export function identifyDominantPollutant(pollutants: PollutantBreakdown): {
	readonly name: string;
	readonly concentration: number;
	readonly unit: string;
} {
	const pm25Aqi = calculatePm25Aqi(pollutants.pm25);
	const pm10Aqi = calculatePm10Aqi(pollutants.pm10);

	if (pm25Aqi >= pm10Aqi && pm25Aqi >= 30) {
		return {
			name: "PM2.5",
			concentration: Math.round(pollutants.pm25 * 10) / 10,
			unit: "µg/m³",
		};
	}

	if (pm10Aqi > pm25Aqi && pm10Aqi >= 30) {
		return {
			name: "PM10",
			concentration: Math.round(pollutants.pm10),
			unit: "µg/m³",
		};
	}

	if (pollutants.no2 > 50) {
		return {
			name: "NO2",
			concentration: Math.round(pollutants.no2),
			unit: "µg/m³",
		};
	}

	return {
		name: "PM2.5",
		concentration: Math.round(pollutants.pm25 * 10) / 10,
		unit: "µg/m³",
	};
}
