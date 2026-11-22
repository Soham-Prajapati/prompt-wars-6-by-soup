/**
 * Unit tests for Forecast Analysis and Best Outdoor Window Identification.
 */

import { describe, expect, it } from "vitest";
import {
	build24HourForecastStrip,
	findBestOutdoorWindow,
	parseOpenMeteoHourly,
	type RawOpenMeteoHourly,
} from "@/lib/forecast";
import type { HourlyForecastPoint } from "@/lib/types";

function createMockPoint(hour: number, aqi: number, pm25 = 20): HourlyForecastPoint {
	const hourLabel = `${String(hour).padStart(2, "0")}:00`;
	return {
		timestamp: `2026-11-22T${hourLabel}:00Z`,
		hourLabel,
		usAqi: aqi,
		pm25,
		pm10: pm25 * 1.5,
		no2: 25,
		o3: 30,
		co: 300,
		bandCode: aqi <= 50 ? "good" : aqi <= 100 ? "moderate" : "unhealthy",
		bandLabel: aqi <= 50 ? "Good" : aqi <= 100 ? "Moderate" : "Unhealthy",
		isBestWindow: false,
	};
}

describe("findBestOutdoorWindow", () => {
	it("returns safe fallback when forecast array is empty", () => {
		const best = findBestOutdoorWindow([]);
		expect(best.startHour).toBe("12:00");
		expect(best.endHour).toBe("14:00");
		expect(best.averageAqi).toBe(50);
		expect(best.recommendation).toContain("Default baseline window");
	});

	it("identifies lowest contiguous 2-hour window in typical winter smog curve", () => {
		// Smog high in morning (200), dipping at midday (80), rising in evening (240)
		const hourly: HourlyForecastPoint[] = [];
		for (let h = 0; h < 24; h++) {
			let aqi = 220;
			if (h >= 13 && h <= 15) {
				aqi = 75; // Cleanest afternoon solar convective mixing window
			} else if (h >= 11 && h <= 17) {
				aqi = 110;
			}
			hourly.push(createMockPoint(h, aqi, aqi * 0.7));
		}

		const best = findBestOutdoorWindow(hourly, 2, 24);
		expect(best.startHour).toBe("13:00");
		expect(best.endHour).toBe("14:00");
		expect(best.durationHours).toBe(2);
		expect(best.averageAqi).toBe(75);
		expect(best.recommendation).toContain("Acceptable outdoor window");
	});

	it("identifies prime window when AQI <= 50", () => {
		const hourly = [createMockPoint(10, 40), createMockPoint(11, 42)];
		const best = findBestOutdoorWindow(hourly, 2);
		expect(best.averageAqi).toBeLessThanOrEqual(50);
		expect(best.recommendation).toContain("Prime outdoor window");
	});

	it("identifies cautious window when lowest AQI is 140", () => {
		const hourly = [createMockPoint(12, 140), createMockPoint(13, 140)];
		const best = findBestOutdoorWindow(hourly, 2);
		expect(best.recommendation).toContain("Cautious window");
	});

	it("identifies restricted window when all periods are heavily polluted (> 200)", () => {
		const hourly = [createMockPoint(12, 250), createMockPoint(13, 260)];
		const best = findBestOutdoorWindow(hourly, 2);
		expect(best.recommendation).toContain("Restricted window");
	});

	it("respects durationHours parameter for 3-hour contiguous window", () => {
		const hourly = [
			createMockPoint(10, 100),
			createMockPoint(11, 60),
			createMockPoint(12, 60),
			createMockPoint(13, 60),
			createMockPoint(14, 180),
		];
		const best = findBestOutdoorWindow(hourly, 3, 24);
		expect(best.durationHours).toBe(3);
		expect(best.startHour).toBe("11:00");
		expect(best.endHour).toBe("13:00");
		expect(best.averageAqi).toBe(60);
	});

	it("respects maxLookahead parameter", () => {
		// Lowest AQI at hour 35, but lookahead capped at 24
		const hourly: HourlyForecastPoint[] = [];
		for (let h = 0; h < 48; h++) {
			const aqi = h === 35 ? 10 : 150;
			hourly.push(createMockPoint(h, aqi));
		}
		const best = findBestOutdoorWindow(hourly, 2, 24);
		expect(best.startHour).not.toBe("35:00");
	});
});

describe("build24HourForecastStrip", () => {
	it("slices exactly 24 points from longer 48h array", () => {
		const hourly: HourlyForecastPoint[] = [];
		for (let h = 0; h < 48; h++) {
			hourly.push(createMockPoint(h, 100));
		}
		const best = findBestOutdoorWindow(hourly, 2);
		const strip = build24HourForecastStrip(hourly, best);
		expect(strip.length).toBe(24);
	});

	it("accurately tags isBestWindow only on hours within the chosen window", () => {
		const hourly: HourlyForecastPoint[] = [];
		for (let h = 0; h < 24; h++) {
			hourly.push(createMockPoint(h, h === 14 || h === 15 ? 40 : 180));
		}
		const best = findBestOutdoorWindow(hourly, 2);
		const strip = build24HourForecastStrip(hourly, best);

		const bestPoints = strip.filter((p) => p.isBestWindow);
		expect(bestPoints.length).toBe(2);
		expect(bestPoints.map((p) => p.hourLabel)).toEqual(["14:00", "15:00"]);
	});

	it("tags a best window that crosses midnight by sequence position", () => {
		const hourly = [createMockPoint(23, 40), createMockPoint(0, 42), createMockPoint(1, 180)];
		const best = findBestOutdoorWindow(hourly, 2);
		const strip = build24HourForecastStrip(hourly, best);
		expect(best.startHour).toBe("23:00");
		expect(best.endHour).toBe("00:00");
		expect(strip.filter((point) => point.isBestWindow).map((point) => point.hourLabel)).toEqual([
			"23:00",
			"00:00",
		]);
	});
});

describe("parseOpenMeteoHourly", () => {
	it("parses raw Open-Meteo time arrays and attributes", () => {
		const raw: RawOpenMeteoHourly = {
			time: ["2026-11-22T08:00:00Z", "2026-11-22T09:00:00Z"],
			us_aqi: [165, 180],
			pm2_5: [92.4, 110.1],
			pm10: [140.0, 160.5],
			nitrogen_dioxide: [45.2, 52.0],
			ozone: [25.0, 30.0],
			carbon_monoxide: [400, 450],
		};

		const parsed = parseOpenMeteoHourly(raw);
		expect(parsed.length).toBe(2);
		expect(parsed[0]?.usAqi).toBe(165);
		expect(parsed[0]?.pm25).toBe(92.4);
		expect(parsed[0]?.bandCode).toBe("unhealthy");
		expect(parsed[0]?.hourLabel).toBeDefined();
	});

	it("handles missing or null pollutant entries gracefully", () => {
		const raw: RawOpenMeteoHourly = {
			time: ["2026-11-22T12:00:00Z"],
			us_aqi: [null],
			pm2_5: [null],
		};

		const parsed = parseOpenMeteoHourly(raw);
		expect(parsed.length).toBe(1);
		expect(parsed[0]?.usAqi).toBe(0);
		expect(parsed[0]?.pm25).toBe(0);
		expect(parsed[0]?.bandCode).toBe("good");
	});

	it("skips empty time entries", () => {
		const raw: RawOpenMeteoHourly = {
			time: [""],
		};
		const parsed = parseOpenMeteoHourly(raw);
		expect(parsed.length).toBe(0);
	});
});
