/**
 * Household Profile and Member Risk Assessment Engine.
 *
 * Evaluates individual family member vulnerabilities against prevailing EPA AQI
 * bands, taking into account physiological differences (lung surface area,
 * minute ventilation rates, preexisting cardiorespiratory disease, and occupational exposure).
 *
 * Medical references:
 * - American Lung Association: State of the Air Vulnerable Populations Guidelines.
 * - EPA Integrated Science Assessment (ISA) for Particulate Matter (EPA/600/R-19/188).
 * - WHO Air Quality Guidelines (2021 update).
 */

import type {
	AqiBandCode,
	HouseholdProfile,
	MemberRisk,
	RiskTier,
} from "@/lib/types";

/**
 * Standard sensible defaults for an urban family profile.
 */
export const DEFAULT_PROFILE: HouseholdProfile = {
	childrenUnder12: 1,
	adultsOver65: 0,
	pregnant: false,
	respiratoryCondition: false,
	outdoorWorker: false,
	commuteMode: "car_solo",
	commuteDistanceKm: 8,
	cookingFuel: "lpg",
	heating: "none",
	hasAirPurifier: false,
	hasN95Masks: false,
	homeType: "apartment",
	smokerInHouse: false,
};

/**
 * Maps AQI band severity into baseline risk tier.
 */
function bandToBaseRisk(band: AqiBandCode): RiskTier {
	switch (band) {
		case "good":
			return "low";
		case "moderate":
			return "moderate";
		case "unhealthy_sensitive":
			return "moderate";
		case "unhealthy":
			return "high";
		case "very_unhealthy":
			return "severe";
		case "hazardous":
			return "critical";
	}
}

/**
 * Elevate a risk tier by one level for sensitive physiological groups.
 */
function elevateRisk(base: RiskTier): RiskTier {
	switch (base) {
		case "low":
			return "moderate";
		case "moderate":
			return "high";
		case "high":
			return "severe";
		case "severe":
		case "critical":
			return "critical";
	}
}

/**
 * Determine risk tier and specific precautions for children under 12.
 */
function evaluateChildrenRisk(count: number, band: AqiBandCode): MemberRisk {
	const base = bandToBaseRisk(band);
	const riskTier = band === "good" ? "low" : elevateRisk(base);

	let action = "Normal outdoor playtime permitted.";
	if (band === "moderate") {
		action = "Monitor for coughing during prolonged heavy outdoor exertion.";
	} else if (band === "unhealthy_sensitive") {
		action = "Limit prolonged strenuous outdoor play; shift recess and sports indoors.";
	} else if (band === "unhealthy") {
		action = "Strict indoor policy; seal bedroom windows and cancel outdoor school sports.";
	} else if (band === "very_unhealthy" || band === "hazardous") {
		action = "Emergency lockdown: strictly remain indoors, keep air filter on high in bedrooms.";
	}

	return {
		memberType: "Children (under 12)",
		count,
		riskTier,
		physiologicalReason:
			"Children breathe 50% more air per kilogram of body weight than adults and have developing alveolar architecture.",
		protectiveAction: action,
	};
}

/**
 * Determine risk tier and specific precautions for seniors over 65.
 */
function evaluateElderlyRisk(count: number, band: AqiBandCode): MemberRisk {
	const base = bandToBaseRisk(band);
	const riskTier = band === "good" ? "low" : elevateRisk(base);

	let action = "Safe to engage in outdoor walks and garden activities.";
	if (band === "moderate") {
		action = "Avoid strenuous outdoor walks during morning traffic rush hours.";
	} else if (band === "unhealthy_sensitive") {
		action = "Reduce outdoor walks; maintain indoor air filtration.";
	} else if (band === "unhealthy") {
		action = "Stay indoors in clean filtered rooms; keep prescribed cardiovascular rescue medications accessible.";
	} else if (band === "very_unhealthy" || band === "hazardous") {
		action = "Hazardous cardiorespiratory alert: stay strictly inside filtered rooms; avoid physical exertion.";
	}

	return {
		memberType: "Adults (over 65)",
		count,
		riskTier,
		physiologicalReason:
			"Heightened susceptibility to particulate-induced autonomic dysfunction, arrhythmias, and acute microvascular constriction.",
		protectiveAction: action,
	};
}

/**
 * Determine risk tier and specific precautions for pregnant individuals.
 */
function evaluatePregnancyRisk(band: AqiBandCode): MemberRisk {
	const base = bandToBaseRisk(band);
	const riskTier = band === "good" ? "low" : elevateRisk(base);

	let action = "Standard prenatal routine safe.";
	if (band === "moderate") {
		action = "Choose green parks rather than busy roadside routes for daily walks.";
	} else if (band === "unhealthy_sensitive" || band === "unhealthy") {
		action = "Wear a well-fitted N95 mask when commuting outdoors; maintain indoor air filtration.";
	} else {
		action = "Strict indoor rest in filtered room; ultrafine particles cross the placental barrier.";
	}

	return {
		memberType: "Pregnant family member",
		count: 1,
		riskTier,
		physiologicalReason:
			"Increased maternal blood volume and minute ventilation; transplacental migration of ultrafine PM2.5 particles.",
		protectiveAction: action,
	};
}

/**
 * Determine risk tier for individuals with asthma, COPD, or coronary heart disease.
 */
function evaluateRespiratoryRisk(band: AqiBandCode): MemberRisk {
	const base = bandToBaseRisk(band);
	const riskTier = band === "good" ? "low" : elevateRisk(base);

	let action = "Follow normal maintenance inhaler or medication schedule.";
	if (band === "moderate") {
		action = "Carry rescue inhaler at all times; watch for airway tightness.";
	} else if (band === "unhealthy_sensitive") {
		action = "Avoid outdoor cardio; operate HEPA filtration continuously in sleeping area.";
	} else if (band === "unhealthy") {
		action = "Stay inside clean room; check peak flow meter; keep rescue inhaler within arm's reach.";
	} else {
		action = "Severe broncho-constriction hazard: strictly remain in sealed clean room; contact physician if symptomatic.";
	}

	return {
		memberType: "Asthma / COPD / Heart condition",
		count: 1,
		riskTier,
		physiologicalReason:
			"Preexisting bronchial inflammation and endothelial dysfunction trigger acute bronchospasm upon PM2.5 and NO2 exposure.",
		protectiveAction: action,
	};
}

/**
 * Determine risk tier for outdoor workers.
 */
function evaluateOutdoorWorkerRisk(band: AqiBandCode): MemberRisk {
	const base = bandToBaseRisk(band);
	const riskTier =
		band === "good"
			? "low"
			: band === "moderate"
				? "moderate"
				: elevateRisk(base);

	let action = "Standard outdoor shift without respiratory constraints.";
	if (band === "moderate") {
		action = "Take hydration breaks away from direct vehicle exhaust.";
	} else if (band === "unhealthy_sensitive") {
		action = "Wear a fitted N95 respirator during outdoor shift; take hourly breaks in indoor shelter.";
	} else {
		action = "Mandatory N95/FFP2 respirator with airtight seal; rotate shifts to minimize total outdoor hours.";
	}

	return {
		memberType: "Outdoor worker",
		count: 1,
		riskTier,
		physiologicalReason:
			"Prolonged shift duration (6–10 hours) results in 4x to 8x the cumulative particulate inhalation dose of sedentary individuals.",
		protectiveAction: action,
	};
}

/**
 * Evaluate all member risks for a given household profile and AQI band.
 *
 * @param profile Family household demographics and vulnerabilities.
 * @param aqi Current EPA AQI value.
 * @param bandCode EPA AQI band code.
 * @returns Array of MemberRisk assessments for every vulnerable group present.
 */
export function evaluateHouseholdRisks(
	profile: HouseholdProfile,
	bandCode: AqiBandCode,
): readonly MemberRisk[] {
	const risks: MemberRisk[] = [];

	if (profile.childrenUnder12 > 0) {
		risks.push(evaluateChildrenRisk(profile.childrenUnder12, bandCode));
	}

	if (profile.adultsOver65 > 0) {
		risks.push(evaluateElderlyRisk(profile.adultsOver65, bandCode));
	}

	if (profile.pregnant) {
		risks.push(evaluatePregnancyRisk(bandCode));
	}

	if (profile.respiratoryCondition) {
		risks.push(evaluateRespiratoryRisk(bandCode));
	}

	if (profile.outdoorWorker) {
		risks.push(evaluateOutdoorWorkerRisk(bandCode));
	}

	// Always provide at least one baseline assessment for general adults if no specific vulnerable group is flagged
	if (risks.length === 0) {
		const baseTier = bandToBaseRisk(bandCode);
		risks.push({
			memberType: "Healthy adults",
			count: 1,
			riskTier: baseTier,
			physiologicalReason:
				"Typical adult respiratory tidal volume; systemic oxidative stress occurs at elevated particulate concentrations.",
			protectiveAction:
				bandCode === "good" || bandCode === "moderate"
					? "Maintain normal outdoor routines."
					: bandCode === "unhealthy_sensitive"
						? "Outdoor exertion is acceptable, but take sensible precautions during smog peaks."
						: "Limit prolonged outdoor exertion; wear an N95 mask if outdoors for extended periods.",
		});
	}

	return risks;
}
