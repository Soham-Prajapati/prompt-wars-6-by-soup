/**
 * Unit tests for EPA AQI calculations, breakpoints, and dominant pollutant resolution.
 */

import { describe, expect, it } from "vitest";
import {
	AQI_BANDS,
	calculatePm10Aqi,
	calculatePm25Aqi,
	getAqiBand,
	identifyDominantPollutant,
} from "@/lib/aqi";
import type { PollutantBreakdown } from "@/lib/types";

describe("EPA AQI Bands Resolution", () => {
	it("classifies AQI 0 as Good", () => {
		const band = getAqiBand(0);
		expect(band.code).toBe("good");
		expect(band.label).toBe("Good");
		expect(band.severity).toBe("safe");
		expect(band.icon).toBe("🌱");
	});

	it("classifies boundary AQI 50 as Good", () => {
		expect(getAqiBand(50).code).toBe("good");
	});

	it("classifies AQI 51 as Moderate", () => {
		const band = getAqiBand(51);
		expect(band.code).toBe("moderate");
		expect(band.label).toBe("Moderate");
		expect(band.severity).toBe("caution");
	});

	it("classifies boundary AQI 100 as Moderate", () => {
		expect(getAqiBand(100).code).toBe("moderate");
	});

	it("classifies AQI 101 as Unhealthy for Sensitive Groups", () => {
		const band = getAqiBand(101);
		expect(band.code).toBe("unhealthy_sensitive");
		expect(band.severity).toBe("warning");
	});

	it("classifies boundary AQI 150 as Unhealthy for Sensitive Groups", () => {
		expect(getAqiBand(150).code).toBe("unhealthy_sensitive");
	});

	it("classifies AQI 151 as Unhealthy", () => {
		const band = getAqiBand(151);
		expect(band.code).toBe("unhealthy");
		expect(band.severity).toBe("danger");
	});

	it("classifies boundary AQI 200 as Unhealthy", () => {
		expect(getAqiBand(200).code).toBe("unhealthy");
	});

	it("classifies AQI 201 as Very Unhealthy", () => {
		const band = getAqiBand(201);
		expect(band.code).toBe("very_unhealthy");
		expect(band.severity).toBe("critical");
	});

	it("classifies boundary AQI 300 as Very Unhealthy", () => {
		expect(getAqiBand(300).code).toBe("very_unhealthy");
	});

	it("classifies AQI 301 as Hazardous", () => {
		const band = getAqiBand(301);
		expect(band.code).toBe("hazardous");
		expect(band.severity).toBe("critical");
	});

	it("classifies severe AQI 550 as Hazardous", () => {
		expect(getAqiBand(550).code).toBe("hazardous");
	});

	it("handles negative values gracefully by clamping to 0 (Good)", () => {
		expect(getAqiBand(-25).code).toBe("good");
	});

	it("handles non-finite NaN values gracefully by defaulting to 0", () => {
		expect(getAqiBand(Number.NaN).code).toBe("good");
	});

	it("all defined AQI_BANDS contain descriptions and icons", () => {
		for (const key of Object.keys(AQI_BANDS)) {
			const b = AQI_BANDS[key as keyof typeof AQI_BANDS];
			expect(b.description.length).toBeGreaterThan(10);
			expect(b.icon.length).toBeGreaterThan(0);
		}
	});
});

describe("PM2.5 to EPA AQI Linear Interpolation", () => {
	it("returns 0 AQI for 0 concentration", () => {
		expect(calculatePm25Aqi(0)).toBe(0);
	});

	it("interpolates within Good range (0 - 9.0 µg/m³)", () => {
		const aqi = calculatePm25Aqi(4.5);
		expect(aqi).toBeGreaterThanOrEqual(20);
		expect(aqi).toBeLessThanOrEqual(30);
	});

	it("reaches AQI 50 at 9.0 µg/m³", () => {
		expect(calculatePm25Aqi(9.0)).toBe(50);
	});

	it("reaches AQI 51 at 9.1 µg/m³", () => {
		expect(calculatePm25Aqi(9.1)).toBe(51);
	});

	it("reaches Moderate AQI 100 at 35.4 µg/m³", () => {
		expect(calculatePm25Aqi(35.4)).toBe(100);
	});

	it("reaches Sensitive AQI 101 at 35.5 µg/m³", () => {
		expect(calculatePm25Aqi(35.5)).toBe(101);
	});

	it("reaches Sensitive AQI 150 at 55.4 µg/m³", () => {
		expect(calculatePm25Aqi(55.4)).toBe(150);
	});

	it("reaches Unhealthy AQI 151 at 55.5 µg/m³", () => {
		expect(calculatePm25Aqi(55.5)).toBe(151);
	});

	it("reaches Unhealthy AQI 200 at 125.4 µg/m³", () => {
		expect(calculatePm25Aqi(125.4)).toBe(200);
	});

	it("reaches Very Unhealthy AQI 201 at 125.5 µg/m³", () => {
		expect(calculatePm25Aqi(125.5)).toBe(201);
	});

	it("reaches Very Unhealthy AQI 300 at 225.4 µg/m³", () => {
		expect(calculatePm25Aqi(225.4)).toBe(300);
	});

	it("reaches Hazardous AQI 301 at 225.5 µg/m³", () => {
		expect(calculatePm25Aqi(225.5)).toBe(301);
	});

	it("reaches Hazardous AQI 400 at 325.4 µg/m³", () => {
		expect(calculatePm25Aqi(325.4)).toBe(400);
	});

	it("reaches Hazardous AQI 500 at 500.4 µg/m³", () => {
		expect(calculatePm25Aqi(500.4)).toBe(500);
	});

	it("clamps extreme PM2.5 > 600 µg/m³ to maximum AQI 500", () => {
		expect(calculatePm25Aqi(650)).toBe(500);
	});

	it("returns 0 for negative or non-finite concentration", () => {
		expect(calculatePm25Aqi(-10)).toBe(0);
		expect(calculatePm25Aqi(Number.NaN)).toBe(0);
	});
});

describe("PM10 to EPA AQI Linear Interpolation", () => {
	it("returns 0 AQI for 0 concentration", () => {
		expect(calculatePm10Aqi(0)).toBe(0);
	});

	it("reaches AQI 50 at 54 µg/m³", () => {
		expect(calculatePm10Aqi(54)).toBe(50);
	});

	it("reaches AQI 100 at 154 µg/m³", () => {
		expect(calculatePm10Aqi(154)).toBe(100);
	});

	it("reaches AQI 150 at 254 µg/m³", () => {
		expect(calculatePm10Aqi(254)).toBe(150);
	});

	it("reaches AQI 200 at 354 µg/m³", () => {
		expect(calculatePm10Aqi(354)).toBe(200);
	});

	it("reaches AQI 300 at 424 µg/m³", () => {
		expect(calculatePm10Aqi(424)).toBe(300);
	});

	it("reaches AQI 400 at 504 µg/m³", () => {
		expect(calculatePm10Aqi(504)).toBe(400);
	});

	it("reaches AQI 500 at 604 µg/m³", () => {
		expect(calculatePm10Aqi(604)).toBe(500);
	});

	it("clamps extreme PM10 > 700 µg/m³ to maximum AQI 500", () => {
		expect(calculatePm10Aqi(750)).toBe(500);
	});

	it("returns 0 for negative or NaN PM10", () => {
		expect(calculatePm10Aqi(-5)).toBe(0);
		expect(calculatePm10Aqi(Number.NaN)).toBe(0);
	});
});

describe("Dominant Pollutant Identification", () => {
	it("identifies PM2.5 when fine soot drives the index", () => {
		const pollutants: PollutantBreakdown = {
			usAqi: 180,
			pm25: 110,
			pm10: 45,
			no2: 25,
			o3: 30,
			co: 300,
		};
		const dominant = identifyDominantPollutant(pollutants);
		expect(dominant.name).toBe("PM2.5");
		expect(dominant.concentration).toBe(110);
		expect(dominant.unit).toBe("µg/m³");
	});

	it("identifies PM10 when coarse dust storm dominates", () => {
		const pollutants: PollutantBreakdown = {
			usAqi: 160,
			pm25: 15,
			pm10: 280,
			no2: 20,
			o3: 25,
			co: 200,
		};
		const dominant = identifyDominantPollutant(pollutants);
		expect(dominant.name).toBe("PM10");
		expect(dominant.concentration).toBe(280);
	});

	it("identifies NO2 when vehicular exhaust is extreme and particles are low", () => {
		const pollutants: PollutantBreakdown = {
			usAqi: 80,
			pm25: 5,
			pm10: 10,
			no2: 75,
			o3: 20,
			co: 400,
		};
		const dominant = identifyDominantPollutant(pollutants);
		expect(dominant.name).toBe("NO2");
		expect(dominant.concentration).toBe(75);
	});

	it("defaults to PM2.5 under clean ambient baseline", () => {
		const pollutants: PollutantBreakdown = {
			usAqi: 25,
			pm25: 6.0,
			pm10: 12.0,
			no2: 10,
			o3: 15,
			co: 100,
		};
		const dominant = identifyDominantPollutant(pollutants);
		expect(dominant.name).toBe("PM2.5");
		expect(dominant.concentration).toBe(6.0);
	});
});
