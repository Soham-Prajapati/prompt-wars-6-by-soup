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
