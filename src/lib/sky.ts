import { getAqiBand } from "@/lib/aqi";
import type { AqiBandCode } from "@/lib/types";

/** Dynamic sky tokens for the AQI band. The foreground is selected for AA contrast. */
export interface SkyPalette {
	readonly code: AqiBandCode;
	readonly start: string;
	readonly mid: string;
	readonly end: string;
	readonly fog: string;
	readonly foreground: string;
	readonly muted: string;
}

export const SKY_PALETTES: Readonly<Record<AqiBandCode, SkyPalette>> = {
	good: {
		code: "good",
		start: "#d9eff1",
		mid: "#c2e1e2",
		end: "#a8cbd0",
		fog: "#f0faf7",
		foreground: "#12383f",
		muted: "#28545a",
	},
	moderate: {
		code: "moderate",
		start: "#dbe3dc",
		mid: "#c7d2ca",
		end: "#aebbaf",
		fog: "#f2f5ef",
		foreground: "#20322f",
		muted: "#2f493f",
	},
	unhealthy_sensitive: {
		code: "unhealthy_sensitive",
		start: "#d8d7c4",
		mid: "#c4c2aa",
		end: "#aaac91",
		fog: "#f2f1e4",
		foreground: "#29271f",
		muted: "#3c3b30",
	},
	unhealthy: {
		code: "unhealthy",
		start: "#d7c8a9",
		mid: "#bdac89",
		end: "#9a8d70",
		fog: "#f2ead8",
		foreground: "#2d2419",
		muted: "#2d2419",
	},
	very_unhealthy: {
		code: "very_unhealthy",
		start: "#6b665f",
		mid: "#5a554f",
		end: "#4a4642",
		fog: "#c2b7a9",
		foreground: "#fff7e9",
		muted: "#fff7e9",
	},
	hazardous: {
		code: "hazardous",
		start: "#62564d",
		mid: "#524840",
		end: "#413a35",
		fog: "#b5a397",
		foreground: "#fff8eb",
		muted: "#fff8eb",
	},
};

/** Resolve the live sky treatment from the same AQI value shown to the user. */
export function getSkyPalette(aqi: number): SkyPalette {
	return SKY_PALETTES[getAqiBand(aqi).code];
}
