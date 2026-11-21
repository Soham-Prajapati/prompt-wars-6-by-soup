/**
 * Core domain types for ClearAir — Urban Air Quality Assistant.
 *
 * Defines the contracts for air quality classification, household profiles,
 * forecast analysis, routine scheduling, indoor air hacks, and quantified
 * impact metrics.
 */

/** Standard EPA AQI band codes. */
export type AqiBandCode =
	| "good"
	| "moderate"
	| "unhealthy_sensitive"
	| "unhealthy"
	| "very_unhealthy"
	| "hazardous";

/** EPA AQI band definition with human-readable guidance. */
export interface AqiBand {
	readonly code: AqiBandCode;
	readonly label: string;
	readonly minAqi: number;
	readonly maxAqi: number;
	readonly severity: "safe" | "caution" | "warning" | "danger" | "critical";
	readonly description: string;
	readonly icon: string;
}

/** Measured pollutant concentrations and derived indices. */
export interface PollutantBreakdown {
	readonly usAqi: number;
	readonly pm25: number;
	readonly pm10: number;
	readonly no2: number;
	readonly o3: number;
	readonly co: number;
}

/** Single hour in the 48-hour air quality forecast. */
export interface HourlyForecastPoint {
	readonly timestamp: string;
	readonly hourLabel: string;
	readonly usAqi: number;
	readonly pm25: number;
	readonly pm10: number;
	readonly no2: number;
	readonly o3: number;
	readonly co: number;
	readonly bandCode: AqiBandCode;
	readonly bandLabel: string;
	readonly isBestWindow: boolean;
}

/** Commute transit modes supported by the impact model. */
export type CommuteMode =
	| "walk"
	| "bicycle"
	| "metro"
	| "bus"
	| "carpool"
	| "car_solo"
	| "motorbike";

/** Residential cooking fuel types. */
export type CookingFuel = "biomass" | "lpg" | "induction" | "electric";

/** Residential space heating fuel types. */
export type HeatingType = "none" | "wood" | "coal" | "electric" | "gas";

/** Home structural infiltration category. */
export type HomeType = "apartment" | "detached" | "informal";

/** Family profile and environmental context. */
export interface HouseholdProfile {
	readonly childrenUnder12: number;
	readonly adultsOver65: number;
	readonly pregnant: boolean;
	readonly respiratoryCondition: boolean;
	readonly outdoorWorker: boolean;
	readonly commuteMode: CommuteMode;
	readonly commuteDistanceKm: number;
	readonly cookingFuel: CookingFuel;
	readonly heating: HeatingType;
	readonly hasAirPurifier: boolean;
	readonly hasN95Masks: boolean;
	readonly homeType: HomeType;
	readonly smokerInHouse: boolean;
}

/** Risk tier for an individual or vulnerable group. */
export type RiskTier = "low" | "moderate" | "high" | "severe" | "critical";

/** Individual household member vulnerability report. */
export interface MemberRisk {
	readonly memberType: string;
	readonly count: number;
	readonly riskTier: RiskTier;
	readonly physiologicalReason: string;
	readonly protectiveAction: string;
}

/** Cleanest contiguous window in the forecast. */
export interface BestOutdoorWindow {
	readonly startHour: string;
	readonly endHour: string;
	readonly durationHours: number;
	readonly averageAqi: number;
	readonly minAqi: number;
	readonly averagePm25: number;
	readonly recommendation: string;
}

/** Timed segment of the low-emission daily routine. */
export interface RoutineSegment {
	readonly id: string;
	readonly timeSpan: string;
	readonly label: string;
	readonly outdoorActivityAllowed: boolean;
	readonly ventilationAdvice: string;
	readonly actionDescription: string;
	readonly targetedMembers: readonly string[];
}

/** Indoor air quality intervention hack. */
export interface AirHack {
	readonly id: string;
	readonly rank: number;
	readonly title: string;
	readonly impactCategory: "high" | "medium" | "low";
	readonly pm25ReductionPct: number;
	readonly estimatedCost: "free" | "low" | "medium";
	readonly summary: string;
	readonly instructions: readonly string[];
	readonly relevanceReason: string;
}

/** Sustainable lifestyle alternative with quantified impact. */
export interface SustainableAlternative {
	readonly id: string;
	readonly category: "commute" | "cooking" | "heating";
	readonly title: string;
	readonly currentOption: string;
	readonly proposedOption: string;
	readonly co2AvoidedKgWeekly: number;
	readonly pm25AvoidedGramsWeekly: number;
	readonly indoorPm25ReductionPct: number;
	readonly rationale: string;
	readonly scientificBasis: string;
}

/** Single exposure reduction factor. */
export interface ExposureReductionFactor {
	readonly intervention: string;
	readonly relativeReductionPct: number;
	readonly mechanism: string;
}

/** Cumulative estimated PM2.5 exposure reduction. */
export interface ExposureImpact {
	readonly baselineInhaledPm25UgDay: number;
	readonly optimizedInhaledPm25UgDay: number;
	readonly netReductionPct: number;
	readonly factors: readonly ExposureReductionFactor[];
}

/** Supported briefing and assistant languages. */
export type SupportedLanguage = "en" | "hi" | "es" | "zh" | "fr";

/** Geocoded location result. */
export interface GeoLocation {
	readonly id: number;
	readonly name: string;
	readonly country: string;
	readonly admin1?: string | undefined;
	readonly latitude: number;
	readonly longitude: number;
	readonly timezone: string;
}

/** Comprehensive computed daily plan for a family. */
export interface CleanAirPlan {
	readonly location: GeoLocation;
	readonly currentAqi: number;
	readonly currentBand: AqiBand;
	readonly dominantPollutant: {
		readonly name: string;
		readonly concentration: number;
		readonly unit: string;
	};
	readonly pollutants: PollutantBreakdown;
	readonly bestWindow: BestOutdoorWindow;
	readonly forecast24h: readonly HourlyForecastPoint[];
	readonly memberRisks: readonly MemberRisk[];
	readonly dailyRoutine: readonly RoutineSegment[];
	readonly rankedHacks: readonly AirHack[];
	readonly alternatives: readonly SustainableAlternative[];
	readonly exposureImpact: ExposureImpact;
	readonly computedAt: string;
}
