/**
 * WCAG 2.1 Contrast Enforcement Test.
 *
 * Parses the production globals.css stylesheet directly and computes contrast
 * ratios for all theme tokens across dark and light schemes to guarantee
 * accessibility compliance (WCAG 1.4.3 text contrast >= 4.5:1, WCAG 1.4.11 UI non-text >= 3.0:1).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SKY_PALETTES } from "@/lib/sky";

const CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/**
 * Relative luminance of an sRGB hex colour per WCAG 2.1 formula.
 */
function luminance(hex: string): number {
	const clean = hex.replace("#", "");
	const parts = [clean.slice(0, 2), clean.slice(2, 4), clean.slice(4, 6)];
	const channels = parts.map((part) => {
		const value = Number.parseInt(part, 16) / 255;
		return value <= 0.03928
			? value / 12.92
			: Math.pow((value + 0.055) / 1.055, 2.4);
	});
	const [r, g, b] = channels;
	if (r === undefined || g === undefined || b === undefined) {
		throw new Error(`Malformed hex colour: ${hex}`);
	}
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Contrast ratio between two hex colours in the range 1..21.
 */
function contrast(a: string, b: string): number {
	const la = luminance(a);
	const lb = luminance(b);
	const hi = Math.max(la, lb);
	const lo = Math.min(la, lb);
	return (hi + 0.05) / (lo + 0.05);
}

/**
 * Extract a custom CSS property's hex value from a specific block of globals.css.
 */
function token(tokenName: string, scheme: "dark" | "light"): string {
	const boundary = CSS.indexOf("@media (prefers-color-scheme: dark)");
	expect(boundary).toBeGreaterThan(-1);

	const region = scheme === "light" ? CSS.slice(0, boundary) : CSS.slice(boundary);
	const matches = [
		...region.matchAll(new RegExp(`--${tokenName}:\\s*(#[0-9a-fA-F]{6})`, "g")),
	];
	const last = matches.at(-1);
	if (last === undefined) {
		throw new Error(`Token --${tokenName} not found in ${scheme} scheme`);
	}
	const value = last[1];
	if (value === undefined) {
		throw new Error(`Token --${tokenName} has no hex value in ${scheme} scheme`);
	}
	return value;
}

describe("WCAG Design System Contrast", () => {
	const schemes = ["dark", "light"] as const;

	describe.each(schemes)("%s scheme", (scheme) => {
		it("body text meets WCAG AA 4.5:1 against surface", () => {
			const textRatio = contrast(token("ink", scheme), token("surface", scheme));
			expect(textRatio).toBeGreaterThanOrEqual(4.5);
		});

		it("muted text meets WCAG AA 4.5:1 against surface", () => {
			const mutedRatio = contrast(
				token("muted", scheme),
				token("surface", scheme),
			);
			expect(mutedRatio).toBeGreaterThanOrEqual(4.5);
		});

		it("strong borders meet WCAG 1.4.11 non-text contrast of 3:1 against surface", () => {
			const borderRatio = contrast(
				token("line-strong", scheme),
				token("surface", scheme),
			);
			expect(borderRatio).toBeGreaterThanOrEqual(3.0);
		});
	});

	it("keeps sky text readable across every AQI band", () => {
		for (const palette of Object.values(SKY_PALETTES)) {
			for (const skySurface of [palette.start, palette.mid, palette.end]) {
				expect(contrast(palette.foreground, skySurface), palette.code).toBeGreaterThanOrEqual(4.5);
				expect(contrast(palette.muted, skySurface), `${palette.code} muted`).toBeGreaterThanOrEqual(4.5);
			}
		}
	});

	it("computes known mathematical reference ratios correctly", () => {
		expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
		expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
	});
});
