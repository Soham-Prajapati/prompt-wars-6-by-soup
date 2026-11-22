/**
 * Strict Zod validation schemas for all inbound API parameters and upstream responses.
 *
 * Prevents invalid coordinates, prototype pollution, oversized payloads,
 * and malicious or malformed parameters at the server boundary.
 */

import { z } from "zod";

/**
 * Geocoding search query validation schema.
 */
export const geocodeQuerySchema = z.object({
	q: z
		.string()
		.trim()
		.min(2, "Search query must be at least 2 characters.")
		.max(100, "Search query must not exceed 100 characters."),
});

/**
 * Geographic coordinate pair validation schema.
 */
export const airQualityQuerySchema = z.object({
	lat: z.coerce
		.number()
		.min(-90, "Latitude must be between -90 and 90.")
		.max(90, "Latitude must be between -90 and 90."),
	lon: z.coerce
		.number()
		.min(-180, "Longitude must be between -180 and 180.")
		.max(180, "Longitude must be between -180 and 180."),
});

/**
 * Household Profile validation schema.
 */
export const householdProfileSchema = z.object({
	childrenUnder12: z.coerce.number().int().min(0).max(20).default(0),
	adultsOver65: z.coerce.number().int().min(0).max(20).default(0),
	pregnant: z.boolean().default(false),
	respiratoryCondition: z.boolean().default(false),
	outdoorWorker: z.boolean().default(false),
	commuteMode: z
		.enum([
			"walk",
			"bicycle",
			"metro",
			"bus",
			"carpool",
			"car_solo",
			"motorbike",
		])
		.default("car_solo"),
	commuteDistanceKm: z.coerce.number().min(0).max(200).default(8),
	cookingFuel: z
		.enum(["biomass", "lpg", "induction", "electric"])
		.default("lpg"),
	heating: z
		.enum(["none", "wood", "coal", "electric", "gas"])
		.default("none"),
	hasAirPurifier: z.boolean().default(false),
	hasN95Masks: z.boolean().default(false),
	homeType: z.enum(["apartment", "detached", "informal"]).default("apartment"),
	smokerInHouse: z.boolean().default(false),
});

/** Supported languages enum. */
export const supportedLanguageSchema = z.enum(["en", "hi", "es", "zh", "fr"]);

/** Validated location shape accepted by the plan endpoint and returned by geocoding. */
export const geoLocationSchema = z.object({
	id: z.number().int(),
	name: z.string().trim().min(1).max(120),
	country: z.string().trim().min(1).max(120),
	admin1: z.string().trim().max(120).optional(),
	latitude: z.number().min(-90).max(90),
	longitude: z.number().min(-180).max(180),
	timezone: z.string().trim().min(1).max(80),
});

const aqiBandSchema = z.object({
	code: z.enum([
		"good",
		"moderate",
		"unhealthy_sensitive",
		"unhealthy",
		"very_unhealthy",
		"hazardous",
	]),
	label: z.string().min(1).max(80),
	minAqi: z.number().int().min(0).max(500),
	maxAqi: z.number().int().min(0).max(500),
	severity: z.enum(["safe", "caution", "warning", "danger", "critical"]),
	description: z.string().min(1).max(400),
	icon: z.string().min(1).max(8),
});

const pollutantsSchema = z.object({
	usAqi: z.number().int().min(0).max(1000),
	pm25: z.number().min(0).max(10_000),
	pm10: z.number().min(0).max(10_000),
	no2: z.number().min(0).max(10_000),
	o3: z.number().min(0).max(10_000),
	co: z.number().min(0).max(100_000),
});

const forecastPointSchema = z.object({
	timestamp: z.string().min(1).max(80),
	hourLabel: z.string().regex(/^\d{2}:\d{2}$/),
	usAqi: z.number().int().min(0).max(1000),
	pm25: z.number().min(0).max(10_000),
	pm10: z.number().min(0).max(10_000),
	no2: z.number().min(0).max(10_000),
	o3: z.number().min(0).max(10_000),
	co: z.number().min(0).max(100_000),
	bandCode: aqiBandSchema.shape.code,
	bandLabel: z.string().min(1).max(80),
	isBestWindow: z.boolean(),
});

const memberRiskSchema = z.object({
	memberType: z.string().min(1).max(100),
	count: z.number().int().min(1).max(20),
	riskTier: z.enum(["low", "moderate", "high", "severe", "critical"]),
	physiologicalReason: z.string().min(1).max(500),
	protectiveAction: z.string().min(1).max(500),
});

const bestWindowSchema = z.object({
	startHour: z.string().regex(/^\d{2}:\d{2}$/),
	endHour: z.string().regex(/^\d{2}:\d{2}$/),
	durationHours: z.number().int().min(1).max(48),
	averageAqi: z.number().min(0).max(1000),
	minAqi: z.number().min(0).max(1000),
	averagePm25: z.number().min(0).max(10_000),
	recommendation: z.string().min(1).max(500),
});

const routineSegmentSchema = z.object({
	id: z.string().min(1).max(80),
	timeSpan: z.string().min(1).max(80),
	label: z.string().min(1).max(120),
	outdoorActivityAllowed: z.boolean(),
	ventilationAdvice: z.string().min(1).max(500),
	actionDescription: z.string().min(1).max(500),
	targetedMembers: z.array(z.string().min(1).max(100)).max(20),
});

const airHackSchema = z.object({
	id: z.string().min(1).max(80),
	rank: z.number().int().min(1).max(20),
	title: z.string().min(1).max(160),
	impactCategory: z.enum(["high", "medium", "low"]),
	pm25ReductionPct: z.number().min(0).max(100),
	estimatedCost: z.enum(["free", "low", "medium"]),
	summary: z.string().min(1).max(700),
	instructions: z.array(z.string().min(1).max(500)).min(1).max(10),
	relevanceReason: z.string().min(1).max(400),
});

const alternativeSchema = z.object({
	id: z.string().min(1).max(80),
	category: z.enum(["commute", "cooking", "heating"]),
	title: z.string().min(1).max(180),
	currentOption: z.string().min(1).max(160),
	proposedOption: z.string().min(1).max(160),
	co2AvoidedKgWeekly: z.number().min(0).max(10_000),
	pm25AvoidedGramsWeekly: z.number().min(0).max(10_000),
	indoorPm25ReductionPct: z.number().min(0).max(100),
	rationale: z.string().min(1).max(700),
	scientificBasis: z.string().min(1).max(500),
});

const exposureImpactSchema = z.object({
	baselineInhaledPm25UgDay: z.number().min(0).max(1_000_000),
	optimizedInhaledPm25UgDay: z.number().min(0).max(1_000_000),
	netReductionPct: z.number().min(0).max(100),
	factors: z.array(
		z.object({
			intervention: z.string().min(1).max(160),
			relativeReductionPct: z.number().min(0).max(100),
			mechanism: z.string().min(1).max(500),
		}),
	).min(1).max(10),
});

/** Full plan schema used to validate browser-provided context before AI narration. */
export const cleanAirPlanSchema = z.object({
	location: geoLocationSchema,
	currentAqi: z.number().int().min(0).max(1000),
	currentBand: aqiBandSchema,
	dominantPollutant: z.object({
		name: z.string().min(1).max(40),
		concentration: z.number().min(0).max(100_000),
		unit: z.string().min(1).max(30),
	}),
	pollutants: pollutantsSchema,
	bestWindow: bestWindowSchema,
	forecast24h: z.array(forecastPointSchema).max(48),
	memberRisks: z.array(memberRiskSchema).min(1).max(20),
	dailyRoutine: z.array(routineSegmentSchema).min(1).max(12),
	rankedHacks: z.array(airHackSchema).max(20),
	alternatives: z.array(alternativeSchema).max(12),
	exposureImpact: exposureImpactSchema,
	computedAt: z.iso.datetime({ offset: true }),
});

/**
 * Individual chat history message.
 */
export const chatMessageSchema = z.object({
	role: z.enum(["user", "assistant"]),
	content: z.string().trim().min(1).max(1000),
});

/**
 * Briefing generation request payload schema.
 */
export const briefingRequestSchema = z.object({
	profile: householdProfileSchema,
	locationName: z.string().trim().min(1).max(120),
	currentAqi: z.number().int().min(0).max(1000),
	pm25: z.number().min(0),
	bestWindow: z.object({
		startHour: z.string(),
		endHour: z.string(),
		averageAqi: z.number(),
		recommendation: z.string(),
	}),
	topHacks: z.array(z.string()).min(1).max(5),
	language: supportedLanguageSchema.default("en"),
});

/**
 * Interactive Q&A chat request payload schema.
 */
export const chatRequestSchema = z.object({
	question: z
		.string()
		.trim()
		.min(1, "Question cannot be empty.")
		.max(400, "Question cannot exceed 400 characters."),
	profile: householdProfileSchema,
	locationName: z.string().trim().min(1).max(120),
	currentAqi: z.number().int().min(0).max(1000),
	pm25: z.number().min(0),
	bestWindow: z.object({
		startHour: z.string(),
		endHour: z.string(),
		averageAqi: z.number(),
		recommendation: z.string(),
	}),
	history: z.array(chatMessageSchema).max(8).optional().default([]),
	language: supportedLanguageSchema.default("en"),
});
