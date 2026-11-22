/**
 * Unit tests for Household Demographics, Physiological Vulnerabilities, and Risk Evaluation.
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_PROFILE, evaluateHouseholdRisks } from "@/lib/profile";
import type { HouseholdProfile } from "@/lib/types";
import { TEST_PROFILE_HEALTHY, TEST_PROFILE_SENSITIVE } from "./helpers";

describe("DEFAULT_PROFILE", () => {
	it("provides valid defaults with single child and solo car commute", () => {
		expect(DEFAULT_PROFILE.childrenUnder12).toBe(1);
		expect(DEFAULT_PROFILE.adultsOver65).toBe(0);
		expect(DEFAULT_PROFILE.pregnant).toBe(false);
		expect(DEFAULT_PROFILE.respiratoryCondition).toBe(false);
		expect(DEFAULT_PROFILE.commuteMode).toBe("car_solo");
		expect(DEFAULT_PROFILE.cookingFuel).toBe("lpg");
		expect(DEFAULT_PROFILE.hasAirPurifier).toBe(false);
		expect(DEFAULT_PROFILE.homeType).toBe("apartment");
	});
});

describe("evaluateHouseholdRisks across AQI Bands", () => {
	describe("Children under 12", () => {
		const profileWithKids: HouseholdProfile = {
			...DEFAULT_PROFILE,
			childrenUnder12: 2,
			adultsOver65: 0,
			pregnant: false,
			respiratoryCondition: false,
			outdoorWorker: false,
		};

		it("assigns low risk during Good AQI band", () => {
			const risks = evaluateHouseholdRisks(profileWithKids, "good");
			const childRisk = risks.find((r) => r.memberType.includes("Children"));
			expect(childRisk).toBeDefined();
			expect(childRisk?.riskTier).toBe("low");
			expect(childRisk?.protectiveAction).toContain("Normal outdoor playtime");
			expect(childRisk?.count).toBe(2);
		});

		it("elevates to high risk during Moderate AQI band", () => {
			const risks = evaluateHouseholdRisks(profileWithKids, "moderate");
			const childRisk = risks.find((r) => r.memberType.includes("Children"));
			expect(childRisk?.riskTier).toBe("high");
			expect(childRisk?.protectiveAction).toContain("coughing");
		});

		it("assigns high risk with recess shifting during Unhealthy for Sensitive Groups", () => {
			const risks = evaluateHouseholdRisks(profileWithKids, "unhealthy_sensitive");
			const childRisk = risks.find((r) => r.memberType.includes("Children"));
			expect(childRisk?.riskTier).toBe("high");
			expect(childRisk?.protectiveAction).toContain("recess and sports indoors");
		});

		it("assigns severe risk during Unhealthy AQI band", () => {
			const risks = evaluateHouseholdRisks(profileWithKids, "unhealthy");
			const childRisk = risks.find((r) => r.memberType.includes("Children"));
			expect(childRisk?.riskTier).toBe("severe");
			expect(childRisk?.protectiveAction).toContain("Strict indoor policy");
		});

		it("assigns critical risk during Hazardous AQI band", () => {
			const risks = evaluateHouseholdRisks(profileWithKids, "hazardous");
			const childRisk = risks.find((r) => r.memberType.includes("Children"));
			expect(childRisk?.riskTier).toBe("critical");
			expect(childRisk?.protectiveAction).toContain("Emergency lockdown");
		});

		it("cites accurate pediatric alveolar ventilation physiology", () => {
			const risks = evaluateHouseholdRisks(profileWithKids, "unhealthy");
			const childRisk = risks.find((r) => r.memberType.includes("Children"));
			expect(childRisk?.physiologicalReason).toContain("50% more air per kilogram");
		});
	});

	describe("Adults over 65 (Seniors)", () => {
		const profileWithSeniors: HouseholdProfile = {
			...DEFAULT_PROFILE,
			childrenUnder12: 0,
			adultsOver65: 1,
			pregnant: false,
			respiratoryCondition: false,
			outdoorWorker: false,
		};

		it("assigns low risk during Good AQI", () => {
			const risks = evaluateHouseholdRisks(profileWithSeniors, "good");
			const seniorRisk = risks.find((r) => r.memberType.includes("65"));
			expect(seniorRisk?.riskTier).toBe("low");
			expect(seniorRisk?.protectiveAction).toContain("outdoor walks");
		});

		it("warns about morning rush traffic during Moderate AQI", () => {
			const risks = evaluateHouseholdRisks(profileWithSeniors, "moderate");
			const seniorRisk = risks.find((r) => r.memberType.includes("65"));
			expect(seniorRisk?.protectiveAction).toContain("Avoid strenuous outdoor walks");
		});

		it("recommends reduced outdoor walks and indoor filtration during Sensitive AQI", () => {
			const risks = evaluateHouseholdRisks(profileWithSeniors, "unhealthy_sensitive");
			const seniorRisk = risks.find((r) => r.memberType.includes("65"));
			expect(seniorRisk?.protectiveAction).toContain("maintain indoor air filtration");
		});

		it("recommends cardiovascular rescue medication access during Unhealthy AQI", () => {
			const risks = evaluateHouseholdRisks(profileWithSeniors, "unhealthy");
			const seniorRisk = risks.find((r) => r.memberType.includes("65"));
			expect(seniorRisk?.riskTier).toBe("severe");
			expect(seniorRisk?.protectiveAction).toContain("rescue medications accessible");
		});

		it("triggers hazardous cardiorespiratory alert during Hazardous AQI", () => {
			const risks = evaluateHouseholdRisks(profileWithSeniors, "hazardous");
			const seniorRisk = risks.find((r) => r.memberType.includes("65"));
			expect(seniorRisk?.riskTier).toBe("critical");
			expect(seniorRisk?.protectiveAction).toContain("Hazardous cardiorespiratory alert");
		});

		it("cites autonomic dysfunction and acute microvascular constriction", () => {
			const risks = evaluateHouseholdRisks(profileWithSeniors, "unhealthy");
			const seniorRisk = risks.find((r) => r.memberType.includes("65"));
			expect(seniorRisk?.physiologicalReason).toContain("autonomic dysfunction");
		});
	});

	describe("Pregnant family member", () => {
		const profilePregnant: HouseholdProfile = {
			...DEFAULT_PROFILE,
			childrenUnder12: 0,
			adultsOver65: 0,
			pregnant: true,
			respiratoryCondition: false,
			outdoorWorker: false,
		};

		it("assigns low risk during Good AQI", () => {
			const risks = evaluateHouseholdRisks(profilePregnant, "good");
			const pregRisk = risks.find((r) => r.memberType.includes("Pregnant"));
			expect(pregRisk?.riskTier).toBe("low");
		});

		it("advises green parks rather than roadsides during Moderate AQI", () => {
			const risks = evaluateHouseholdRisks(profilePregnant, "moderate");
			const pregRisk = risks.find((r) => r.memberType.includes("Pregnant"));
			expect(pregRisk?.protectiveAction).toContain("green parks");
		});

		it("recommends fitted N95 during Unhealthy AQI", () => {
			const risks = evaluateHouseholdRisks(profilePregnant, "unhealthy");
			const pregRisk = risks.find((r) => r.memberType.includes("Pregnant"));
			expect(pregRisk?.protectiveAction).toContain("N95 mask");
		});

		it("recommends strict indoor rest during Hazardous AQI", () => {
			const risks = evaluateHouseholdRisks(profilePregnant, "hazardous");
			const pregRisk = risks.find((r) => r.memberType.includes("Pregnant"));
			expect(pregRisk?.protectiveAction).toContain("Strict indoor rest");
		});

		it("cites transplacental migration of ultrafine particles", () => {
			const risks = evaluateHouseholdRisks(profilePregnant, "very_unhealthy");
			const pregRisk = risks.find((r) => r.memberType.includes("Pregnant"));
			expect(pregRisk?.physiologicalReason).toContain("transplacental migration");
		});
	});

	describe("Asthma / COPD / Heart Condition", () => {
		const profileAsthma: HouseholdProfile = {
			...DEFAULT_PROFILE,
			childrenUnder12: 0,
			adultsOver65: 0,
			pregnant: false,
			respiratoryCondition: true,
			outdoorWorker: false,
		};

		it("advises maintenance inhaler adherence during Good AQI", () => {
			const risks = evaluateHouseholdRisks(profileAsthma, "good");
			const asthmaRisk = risks.find((r) => r.memberType.includes("Asthma"));
			expect(asthmaRisk?.protectiveAction).toContain("maintenance inhaler");
		});

		it("advises carrying rescue inhaler during Moderate AQI", () => {
			const risks = evaluateHouseholdRisks(profileAsthma, "moderate");
			const asthmaRisk = risks.find((r) => r.memberType.includes("Asthma"));
			expect(asthmaRisk?.protectiveAction).toContain("Carry rescue inhaler");
		});

		it("advises avoiding outdoor cardio and continuous HEPA in Sensitive AQI", () => {
			const risks = evaluateHouseholdRisks(profileAsthma, "unhealthy_sensitive");
			const asthmaRisk = risks.find((r) => r.memberType.includes("Asthma"));
			expect(asthmaRisk?.protectiveAction).toContain("Avoid outdoor cardio");
		});

		it("alerts for peak flow monitoring and arm's reach inhaler during Unhealthy AQI", () => {
			const risks = evaluateHouseholdRisks(profileAsthma, "unhealthy");
			const asthmaRisk = risks.find((r) => r.memberType.includes("Asthma"));
			expect(asthmaRisk?.riskTier).toBe("severe");
			expect(asthmaRisk?.protectiveAction).toContain("peak flow meter");
		});

		it("warns of severe broncho-constriction hazard in Hazardous AQI", () => {
			const risks = evaluateHouseholdRisks(profileAsthma, "hazardous");
			const asthmaRisk = risks.find((r) => r.memberType.includes("Asthma"));
			expect(asthmaRisk?.riskTier).toBe("critical");
			expect(asthmaRisk?.protectiveAction).toContain("Severe broncho-constriction");
		});

		it("cites bronchospasm upon PM2.5 and NO2 exposure", () => {
			const risks = evaluateHouseholdRisks(profileAsthma, "unhealthy");
			const asthmaRisk = risks.find((r) => r.memberType.includes("Asthma"));
			expect(asthmaRisk?.physiologicalReason).toContain("acute bronchospasm");
		});
	});

	describe("Outdoor Workers", () => {
		const profileWorker: HouseholdProfile = {
			...DEFAULT_PROFILE,
			childrenUnder12: 0,
			adultsOver65: 0,
			pregnant: false,
			respiratoryCondition: false,
			outdoorWorker: true,
		};

		it("allows standard shift without restrictions in Good AQI", () => {
			const risks = evaluateHouseholdRisks(profileWorker, "good");
			const workerRisk = risks.find((r) => r.memberType.includes("Outdoor worker"));
			expect(workerRisk?.riskTier).toBe("low");
			expect(workerRisk?.protectiveAction).toContain("Standard outdoor shift");
		});

		it("advises hydration breaks away from traffic in Moderate AQI", () => {
			const risks = evaluateHouseholdRisks(profileWorker, "moderate");
			const workerRisk = risks.find((r) => r.memberType.includes("Outdoor worker"));
			expect(workerRisk?.protectiveAction).toContain("hydration breaks away from direct vehicle exhaust");
		});

		it("mandates N95 respirator and hourly indoor breaks in Unhealthy Sensitive", () => {
			const risks = evaluateHouseholdRisks(profileWorker, "unhealthy_sensitive");
			const workerRisk = risks.find((r) => r.memberType.includes("Outdoor worker"));
			expect(workerRisk?.protectiveAction).toContain("hourly breaks in indoor shelter");
		});

		it("mandates airtight N95 respirator and shift rotation in Hazardous AQI", () => {
			const risks = evaluateHouseholdRisks(profileWorker, "hazardous");
			const workerRisk = risks.find((r) => r.memberType.includes("Outdoor worker"));
			expect(workerRisk?.riskTier).toBe("critical");
			expect(workerRisk?.protectiveAction).toContain("Mandatory N95/FFP2 respirator");
		});

		it("cites 4x to 8x cumulative particulate inhalation dose", () => {
			const risks = evaluateHouseholdRisks(profileWorker, "unhealthy");
			const workerRisk = risks.find((r) => r.memberType.includes("Outdoor worker"));
			expect(workerRisk?.physiologicalReason).toContain("4x to 8x the cumulative");
		});
	});

	describe("Healthy Adult Baseline", () => {
		it("provides baseline advice when no vulnerable members are selected", () => {
			const risks = evaluateHouseholdRisks(TEST_PROFILE_HEALTHY, "unhealthy");
			expect(risks.length).toBe(1);
			expect(risks[0]?.memberType).toBe("Healthy adults");
			expect(risks[0]?.riskTier).toBe("high");
			expect(risks[0]?.protectiveAction).toContain("Limit prolonged outdoor exertion");
		});

		it("provides sensible advice during Sensitive AQI for healthy adults", () => {
			const risks = evaluateHouseholdRisks(TEST_PROFILE_HEALTHY, "unhealthy_sensitive");
			expect(risks[0]?.protectiveAction).toContain("Outdoor exertion is acceptable");
		});

		it("provides normal routine advice during Good AQI for healthy adults", () => {
			const risks = evaluateHouseholdRisks(TEST_PROFILE_HEALTHY, "good");
			expect(risks[0]?.riskTier).toBe("low");
			expect(risks[0]?.protectiveAction).toContain("Maintain normal outdoor routines");
		});
	});

	describe("Compound Household with All Vulnerabilities", () => {
		it("evaluates all 5 sensitive groups concurrently during severe winter smog", () => {
			const risks = evaluateHouseholdRisks(TEST_PROFILE_SENSITIVE, "very_unhealthy");
			expect(risks.length).toBe(5);
			expect(risks.map((r) => r.memberType)).toEqual(
				expect.arrayContaining([
					expect.stringContaining("Children"),
					expect.stringContaining("Adults"),
					expect.stringContaining("Pregnant"),
					expect.stringContaining("Asthma"),
					expect.stringContaining("Outdoor"),
				]),
			);
			for (const r of risks) {
				expect(["severe", "critical"]).toContain(r.riskTier);
			}
		});
	});
});
