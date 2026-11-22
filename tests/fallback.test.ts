/**
 * Unit tests for Deterministic Fallback Briefing and Response Generation.
 */

import { describe, expect, it } from "vitest";
import {
	generateDeterministicBriefing,
	generateDeterministicChatResponse,
} from "@/lib/fallback";
import { DEFAULT_PROFILE } from "@/lib/profile";
import { MOCK_PLAN } from "./helpers";

describe("generateDeterministicBriefing Multilingual Support", () => {
	it("generates complete English family briefing with all required sections", () => {
		const briefing = generateDeterministicBriefing(MOCK_PLAN, "en");
		expect(briefing).toContain("Daily Air Quality Briefing for New Delhi");
		expect(briefing).toContain("The AQI is **220** (Very Unhealthy 🚨)");
		expect(briefing).toContain("Your Best Outdoor Window");
		expect(briefing).toContain("13:00 and 15:00");
		expect(briefing).toContain("Top 3 Immediate Indoor Hacks");
		expect(briefing).toContain("Direct Impact of Your Choices");
		expect(briefing).toContain("75% reduction");
	});

	it("generates complete Hindi family briefing", () => {
		const briefing = generateDeterministicBriefing(MOCK_PLAN, "hi");
		expect(briefing).toContain("New Delhi के लिए दैनिक वायु गुणवत्ता ब्रीफिंग");
		expect(briefing).toContain("AQI वर्तमान में **220**");
		expect(briefing).toContain("बाहर जाने का सबसे स्वच्छ समय");
		expect(briefing).toContain("13:00 से 15:00");
		expect(briefing).toContain("75% की प्रत्यक्ष कमी");
	});

	it("generates complete Spanish family briefing", () => {
		const briefing = generateDeterministicBriefing(MOCK_PLAN, "es");
		expect(briefing).toContain("Informe Diario de Calidad del Aire para New Delhi");
		expect(briefing).toContain("El índice AQI es de **220**");
		expect(briefing).toContain("Mejor Ventana al Aire Libre");
		expect(briefing).toContain("Reducción de PM2.5");
		expect(briefing).toContain("75%");
	});

	it("generates complete Mandarin family briefing", () => {
		const briefing = generateDeterministicBriefing(MOCK_PLAN, "zh");
		expect(briefing).toContain("New Delhi 今日家庭空气质量简报");
		expect(briefing).toContain("美国空气质量指数(AQI)为 **220**");
		expect(briefing).toContain("今日最佳户外时间段");
		expect(briefing).toContain("13:00 至 15:00");
		expect(briefing).toContain("75% 的暴露量削减");
	});

	it("generates complete French family briefing", () => {
		const briefing = generateDeterministicBriefing(MOCK_PLAN, "fr");
		expect(briefing).toContain("Bulletin Quotidien de Qualité de l'Air pour New Delhi");
		expect(briefing).toContain("L'indice AQI est de **220**");
		expect(briefing).toContain("Meilleure Fenêtre Extérieure");
		expect(briefing).toContain("75%");
	});

	it("defaults safely to English when given unexpected language code", () => {
		// @ts-expect-error testing fallback for invalid code
		const briefing = generateDeterministicBriefing(MOCK_PLAN, "unknown");
		expect(briefing).toContain("Daily Air Quality Briefing");
	});
});

describe("generateDeterministicChatResponse Grounded Answers", () => {
	it("answers questions about window opening and ventilation timing", () => {
		const answer = generateDeterministicChatResponse("When can I open the windows?", MOCK_PLAN, DEFAULT_PROFILE);
		expect(answer).toContain("cleanest outdoor window is between 13:00 and 15:00");
		expect(answer).toContain("AQI 135");
	});

	it("answers questions about masks and N95 respirators", () => {
		const answer = generateDeterministicChatResponse("What mask should my family wear outside?", MOCK_PLAN, DEFAULT_PROFILE);
		expect(answer).toContain("N95 or FFP2 respirator");
		expect(answer).toContain("95%");
		expect(answer).toContain("Avoid cloth masks");
	});

	it("answers questions about purifiers and box fan filters", () => {
		const answer = generateDeterministicChatResponse("Is a DIY box fan purifier really effective?", MOCK_PLAN, DEFAULT_PROFILE);
		expect(answer).toContain("Build Box Fan + MERV-13 Filter");
		expect(answer).toContain("75%");
	});

	it("answers questions mentioning hepa filter specifically", () => {
		const answer = generateDeterministicChatResponse("Should we turn on the hepa purifier?", MOCK_PLAN, DEFAULT_PROFILE);
		expect(answer).toContain("Build Box Fan + MERV-13 Filter");
	});

	it("answers questions about children, elderly, and asthmatic members", () => {
		const answer = generateDeterministicChatResponse("Is it safe for my child to go out?", MOCK_PLAN, DEFAULT_PROFILE);
		expect(answer).toContain("Children (under 12)");
		expect(answer).toContain("Keep strictly indoors");
	});

	it("answers questions about asthma specifically", () => {
		const answer = generateDeterministicChatResponse("What should my asthma patient do?", MOCK_PLAN, DEFAULT_PROFILE);
		expect(answer).toContain("Children (under 12)");
	});

	it("answers questions about elderly family members", () => {
		const answer = generateDeterministicChatResponse("Can my senior grandparents take a walk?", MOCK_PLAN, DEFAULT_PROFILE);
		expect(answer).toContain("Children (under 12)");
	});

	it("answers questions about running or outdoor exercise", () => {
		const answer = generateDeterministicChatResponse("Can I go for an outdoor morning run?", MOCK_PLAN, DEFAULT_PROFILE);
		expect(answer).toContain("cleanest outdoor window is between 13:00 and 15:00");
	});

	it("provides grounded general overview for open-ended queries", () => {
		const answer = generateDeterministicChatResponse("What should we do overall today?", MOCK_PLAN, DEFAULT_PROFILE);
		expect(answer).toContain("Current air quality in New Delhi is AQI 220");
		expect(answer).toContain("75%");
		expect(answer).toContain("13:00 to 15:00");
	});
});
