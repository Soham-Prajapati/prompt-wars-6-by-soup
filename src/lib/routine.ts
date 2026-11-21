/**
 * Low-Emission Daily Routine Scheduling Engine.
 *
 * Constructs a timed, actionable daily routine for the family based on prevailing
 * air pollution bands, forecasted solar boundary layer dynamics (best outdoor window),
 * and household member vulnerabilities.
 *
 * Coordinates when to ventilate, when to avoid the outdoors, when to run purifiers,
 * and how to commute safely during severe winter smog episodes.
 */

import type {
	BestOutdoorWindow,
	HouseholdProfile,
	RoutineSegment,
} from "@/lib/types";

/**
 * Generate a tailored 24-hour routine adapted to air quality conditions and the family profile.
 *
 * @param profile Demographics and current equipment.
 * @param aqi Current EPA AQI level.
 * @param bestWindow The calculated optimal contiguous outdoor window.
 * @returns Array of chronological RoutineSegment objects spanning the entire day.
 */
export function generateDailyRoutine(
	profile: HouseholdProfile,
	aqi: number,
	bestWindow: BestOutdoorWindow,
): readonly RoutineSegment[] {
	const isSevere = aqi > 200;
	const isHigh = aqi > 150;
	const hasVulnerable =
		profile.childrenUnder12 > 0 ||
		profile.adultsOver65 > 0 ||
		profile.respiratoryCondition ||
		profile.pregnant;

	const targetedVulnerable = [
		...(profile.childrenUnder12 > 0 ? ["Children under 12"] : []),
		...(profile.adultsOver65 > 0 ? ["Adults over 65"] : []),
		...(profile.respiratoryCondition ? ["Asthma / Respiratory"] : []),
		...(profile.pregnant ? ["Pregnant members"] : []),
	];

	const allFamily = ["Entire household"];

	// 1. Morning (06:00 – 09:00)
	const morningAction = isHigh
		? "Keep exterior windows strictly shut. Cold winter radiation inversion traps vehicular exhaust close to ground level. Commuters must wear a snug N95 respirator. Avoid outdoor morning jogs."
		: "Moderate air quality. Limit strenuous outdoor cardio near heavy traffic corridors. Ventilate only if indoor air feels stuffy.";

	const morningVentilation = isHigh
		? "Lockdown: zero window opening. Run air purifier on medium in breakfast area."
		: "Minimal crack ventilation permitted away from street-facing walls.";

	// 2. Midday (11:00 – 14:00) - often coincides with best window
	const middayAction = `Optimal outdoor timing window aligns around ${bestWindow.startHour} to ${bestWindow.endHour} (AQI ~${String(bestWindow.averageAqi)}). Complete grocery runs, school pickups, or essential walks now.`;

	const middayVentilation =
		bestWindow.averageAqi <= 100
			? `Perform a 15-minute whole-house cross ventilation flush between ${bestWindow.startHour} and ${bestWindow.endHour}, then seal tightly.`
			: `Air remains elevated (AQI ${String(bestWindow.averageAqi)}). Limit ventilation to 5 minutes or rely entirely on recirculating filtered indoor air.`;

	// 3. Afternoon (14:00 – 17:00)
	const afternoonAction = isSevere
		? "Children and seniors must stay strictly indoors. Shift homework and recreation to central living rooms away from exterior perimeter drafts."
		: isHigh
			? "After-school outdoor play should be restricted or substituted with indoor active games."
			: "Normal afternoon activities permitted with standard hydration.";

	// 4. Evening (18:00 – 21:00)
	const eveningAction =
		"Evening traffic rush and dropping temperatures trigger secondary smog inversion. Switch on kitchen exhaust 1 minute before lighting burners, close interior kitchen doors, and damp-mop floors.";

	const eveningVentilation =
		"Keep all exterior doors and balcony windows sealed against evening vehicular smog ingress.";

	// 5. Night (21:00 – 06:00)
	const nightAction = profile.hasAirPurifier
		? "Activate bedroom air purifier on quiet night mode. Consolidate sleeping areas if necessary to maximize filtered cubic airflow per person."
		: "Set up the DIY box-fan filter in the primary bedroom. Ensure draft excluders are placed under the bedroom door.";

	const nightVentilation =
		"Complete nocturnal seal. Zero exterior air exchange until midday tomorrow.";

	return [
		{
			id: "routine-morning-inversion",
			timeSpan: "06:00 – 09:00",
			label: "Morning Inversion & Safe Commute",
			outdoorActivityAllowed: !isHigh,
			ventilationAdvice: morningVentilation,
			actionDescription: morningAction,
			targetedMembers:
				targetedVulnerable.length > 0 ? targetedVulnerable : allFamily,
		},
		{
			id: "routine-midday-window",
			timeSpan: `${bestWindow.startHour} – ${bestWindow.endHour}`,
			label: "Cleanest Window (Errands & Ventilation)",
			outdoorActivityAllowed: true,
			ventilationAdvice: middayVentilation,
			actionDescription: middayAction,
			targetedMembers: allFamily,
		},
		{
			id: "routine-afternoon-rest",
			timeSpan: "14:00 – 17:00",
			label: "Afternoon Indoor Shielding",
			outdoorActivityAllowed: !isSevere,
			ventilationAdvice:
				"Keep windows closed. Air filtration maintains clean baseline.",
			actionDescription: afternoonAction,
			targetedMembers: hasVulnerable ? targetedVulnerable : allFamily,
		},
		{
			id: "routine-evening-rush",
			timeSpan: "18:00 – 21:00",
			label: "Evening Smog Peak & Clean Cooking",
			outdoorActivityAllowed: false,
			ventilationAdvice: eveningVentilation,
			actionDescription: eveningAction,
			targetedMembers: allFamily,
		},
		{
			id: "routine-night-sanctuary",
			timeSpan: "21:00 – 06:00",
			label: "Nocturnal Clean Bedroom Sanctuary",
			outdoorActivityAllowed: false,
			ventilationAdvice: nightVentilation,
			actionDescription: nightAction,
			targetedMembers: allFamily,
		},
	];
}
