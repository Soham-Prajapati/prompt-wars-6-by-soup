import { describe, expect, it } from "vitest";
import { getSkyPalette } from "@/lib/sky";

describe("AQI sky palette", () => {
	it("follows the EPA band boundaries", () => {
		expect(getSkyPalette(50).code).toBe("good");
		expect(getSkyPalette(51).code).toBe("moderate");
		expect(getSkyPalette(101).code).toBe("unhealthy_sensitive");
		expect(getSkyPalette(151).code).toBe("unhealthy");
		expect(getSkyPalette(201).code).toBe("very_unhealthy");
		expect(getSkyPalette(301).code).toBe("hazardous");
	});

	it("does not use the retired purple treatment", () => {
		expect(getSkyPalette(245).start).not.toBe("#c9a1ef");
		expect(getSkyPalette(245).end).not.toBe("#c9a1ef");
	});
});
