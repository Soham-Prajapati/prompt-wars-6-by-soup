/**
 * Forecast Analysis and Best Outdoor Window Detection Engine.
 *
 * Evaluates 48-hour hourly air quality forecasts to identify the cleanest contiguous
 * time windows for essential outdoor activities (school runs, errands, exercise, ventilation),
 * and detects atmospheric thermal inversion smog peaks.
 */

import { getAqiBand } from "@/lib/aqi";
import type { BestOutdoorWindow, HourlyForecastPoint } from "@/lib/types";

/**
 * Find the optimal contiguous window of `durationHours` with the lowest average AQI
 * within the next 24 to 48 hours.
 *
 * @param hourly Full hourly forecast points.
 * @param durationHours Contiguous window length in hours (default 2).
 * @param maxLookahead Maximum hours ahead to consider (default 24).
 * @returns The best outdoor window structure.
 */
export function findBestOutdoorWindow(
	hourly: readonly HourlyForecastPoint[],
	durationHours = 2,
	maxLookahead = 24,
): BestOutdoorWindow {
	if (hourly.length === 0) {
		return {
			startHour: "12:00",
			endHour: "14:00",
			durationHours,
			averageAqi: 50,
			minAqi: 50,
			averagePm25: 12,
			recommendation: "Default baseline window: no live forecast data available.",
		};
	}

	const candidates = hourly.slice(0, Math.min(hourly.length, maxLookahead));
	const windowSize = Math.max(1, Math.min(durationHours, candidates.length));

	let bestStartIndex = 0;
	let lowestAvgAqi = Number.POSITIVE_INFINITY;
	let bestMinAqi = Number.POSITIVE_INFINITY;
	let bestAvgPm25 = 0;

	for (let i = 0; i <= candidates.length - windowSize; i++) {
		const slice = candidates.slice(i, i + windowSize);
		const sumAqi = slice.reduce((acc, pt) => acc + pt.usAqi, 0);
		const avgAqi = sumAqi / windowSize;

		if (avgAqi < lowestAvgAqi) {
			lowestAvgAqi = avgAqi;
			bestStartIndex = i;
			bestMinAqi = Math.min(...slice.map((p) => p.usAqi));
			bestAvgPm25 = slice.reduce((acc, pt) => acc + pt.pm25, 0) / windowSize;
		}
	}

	const startPoint = candidates[bestStartIndex];
	const endPoint = candidates[bestStartIndex + windowSize - 1];

	const startHour = startPoint ? startPoint.hourLabel : "12:00";
	const endHour = endPoint ? endPoint.hourLabel : "14:00";
	const roundedAvgAqi = Math.round(lowestAvgAqi);
	const roundedMinAqi = Math.round(bestMinAqi);
	const roundedAvgPm25 = Math.round(bestAvgPm25 * 10) / 10;

	let recommendation = `Cleanest window for outdoor errands, exercise, or school pickups (${startHour} – ${endHour}).`;
	if (roundedAvgAqi <= 50) {
		recommendation = `Prime outdoor window (${startHour} – ${endHour}). Air quality is optimal for sports and deep house ventilation.`;
	} else if (roundedAvgAqi <= 100) {
		recommendation = `Acceptable outdoor window (${startHour} – ${endHour}). Good time for walks and rapid 15-minute cross-ventilation.`;
	} else if (roundedAvgAqi <= 150) {
		recommendation = `Cautious window (${startHour} – ${endHour}). Lowest pollution of the day, but sensitive family members should keep exertion low.`;
	} else {
		recommendation = `Restricted window (${startHour} – ${endHour}). Prevailing air is heavily polluted; limit essential errands and keep N95 masks fitted.`;
	}

	return {
		startHour,
		endHour,
		durationHours: windowSize,
		averageAqi: roundedAvgAqi,
		minAqi: roundedMinAqi,
		averagePm25: roundedAvgPm25,
		recommendation,
	};
}

/**
 * Annotate a 24-hour forecast strip with the best window indicator.
 *
 * @param hourly Full forecast data.
 * @param bestWindow The calculated best window.
 * @returns 24 hourly points with `isBestWindow` accurately tagged.
 */
export function build24HourForecastStrip(
	hourly: readonly HourlyForecastPoint[],
	bestWindow: BestOutdoorWindow,
): readonly HourlyForecastPoint[] {
	const strip = hourly.slice(0, 24);
	const startIndex = strip.findIndex((point) => point.hourLabel === bestWindow.startHour);
	const endIndex = strip.findIndex((point) => point.hourLabel === bestWindow.endHour);

	return strip.map((point, index) => {
		// Compare positions instead of clock strings so windows crossing midnight work.
		const isBest =
			startIndex >= 0 && endIndex >= 0 &&
			(startIndex <= endIndex
				? index >= startIndex && index <= endIndex
				: index >= startIndex || index <= endIndex);

		return {
			...point,
			isBestWindow: isBest,
		};
	});
}

/**
 * Raw Open-Meteo hourly response format.
 */
export interface RawOpenMeteoHourly {
	readonly time: readonly string[];
	readonly us_aqi?: readonly (number | null)[];
	readonly pm2_5?: readonly (number | null)[];
	readonly pm10?: readonly (number | null)[];
	readonly nitrogen_dioxide?: readonly (number | null)[];
	readonly ozone?: readonly (number | null)[];
	readonly carbon_monoxide?: readonly (number | null)[];
}

/**
 * Transform Open-Meteo raw arrays into strongly typed hourly points.
 *
 * @param raw Raw arrays returned from the Open-Meteo Air Quality API.
 * @returns Typed array of HourlyForecastPoint.
 */
export function parseOpenMeteoHourly(
	raw: RawOpenMeteoHourly,
): readonly HourlyForecastPoint[] {
	const count = raw.time.length;
	const points: HourlyForecastPoint[] = [];

	for (let i = 0; i < count; i++) {
		const timeStr = raw.time[i];
		if (!timeStr) continue;

		// Extract hour display e.g. "14:00"
		const date = new Date(timeStr);
		if (Number.isNaN(date.getTime())) continue;
		const hourMatch = /T(\d{2}):\d{2}/.exec(timeStr);
		const hours = hourMatch?.[1] ?? String(date.getHours()).padStart(2, "0");
		const hourLabel = `${hours}:00`;

		const aqi = raw.us_aqi?.[i] ?? 0;
		const pm25 = raw.pm2_5?.[i] ?? 0;
		const pm10 = raw.pm10?.[i] ?? 0;
		const no2 = raw.nitrogen_dioxide?.[i] ?? 0;
		const o3 = raw.ozone?.[i] ?? 0;
		const co = raw.carbon_monoxide?.[i] ?? 0;

		const band = getAqiBand(aqi);

		points.push({
			timestamp: timeStr,
			hourLabel,
			usAqi: Math.round(aqi),
			pm25: Math.round(pm25 * 10) / 10,
			pm10: Math.round(pm10 * 10) / 10,
			no2: Math.round(no2 * 10) / 10,
			o3: Math.round(o3 * 10) / 10,
			co: Math.round(co * 10) / 10,
			bandCode: band.code,
			bandLabel: band.label,
			isBestWindow: false,
		});
	}

	return points;
}
