import { describe, expect, it } from "vitest";
import { firstSentence, selectSummaryFacts } from "@/lib/summary";
import { MOCK_PLAN } from "./helpers";

describe("summary fact selection", () => {
	it("surfaces window, risk, highest impact action, and exposure cut", () => {
		const facts = selectSummaryFacts(MOCK_PLAN);

		expect(facts.map((fact) => fact.id)).toEqual(["window", "risk", "action", "exposure"]);
		expect(facts[0]?.value).toBe("13:00–15:00");
		expect(facts[1]?.value).toBe("Children (under 12)");
		expect(facts[2]?.value).toBe("Build Box Fan + MERV-13 Filter");
		expect(facts[3]?.value).toBe("−75%");
	});

	it("keeps disclosure copy to the first useful sentence", () => {
		expect(firstSentence("Keep the windows shut. Run the purifier on medium."))
			.toBe("Keep the windows shut.");
		expect(firstSentence("A concise plan without punctuation"))
			.toBe("A concise plan without punctuation");
	});

	it("falls back cleanly when optional ranked data is empty", () => {
		const sparsePlan = { ...MOCK_PLAN, memberRisks: [], rankedHacks: [] };
		const facts = selectSummaryFacts(sparsePlan);

		expect(facts[1]?.value).toBe("Your household");
		expect(facts[2]?.value).toBe("Follow the routine");
		expect(facts[2]?.note).toBe("Start with the best window");
	});
});
