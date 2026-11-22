/**
 * Indoor Air Quality Hacks & Evidence-Based Intervention Catalog.
 *
 * Ranks practical, low-cost and no-cost interventions for families navigating
 * winter smog episodes. Each hack is dynamically prioritized based on the
 * family's home type, purifier possession, cooking fuel, and vulnerable members.
 *
 * Engineering and aerobiological sources:
 * - EPA Guide to Air Cleaners in the Home (EPA 402-F-08-004).
 * - Corsi-Rosenthal Box Air Cleaning Performance (UC Davis & Harvard T.H. Chan School).
 * - WHO Air Quality Guidelines on Indoor Combustion Hazards.
 */

import type { AirHack, HouseholdProfile } from "@/lib/types";

/**
 * Master catalog of evidence-based indoor air quality hacks.
 */
export const AIR_HACKS_CATALOG: readonly AirHack[] = [
	{
		id: "diy-corsi-rosenthal",
		rank: 1,
		title: "Build a Low-Cost Box Fan + MERV-13 Purifier",
		impactCategory: "high",
		pm25ReductionPct: 75,
		estimatedCost: "low",
		summary:
			"A standard 20-inch box fan taped to a 20x20x1 MERV-13 HVAC furnace filter provides Clean Air Delivery Rates (CADR) equivalent to a $300 commercial HEPA unit at a fraction of the cost.",
		instructions: [
			"Purchase a standard 20-inch box fan and a MERV-13 (or MPR 1900+) pleated HVAC filter.",
			"Place the filter on the back (intake) of the fan with the airflow arrow pointing towards the fan.",
			"Use duct tape or painter's tape along all four perimeter edges to ensure an airtight seal with zero bypass leakage.",
			"Run the fan on speed 1 or 2 in your primary living or sleeping area for continuous particulate removal.",
		],
		relevanceReason:
			"Ideal for homes without expensive commercial HEPA purifiers; provides immediate 70–85% reduction in indoor PM2.5.",
	},
	{
		id: "timed-ventilation",
		rank: 2,
		title: "Strategic Window Timing (Thermal Inversion Bypass)",
		impactCategory: "high",
		pm25ReductionPct: 45,
		estimatedCost: "free",
		summary:
			"Never open windows during early morning or late night winter temperature inversions when heavy smog is trapped near the ground. Ventilate only during afternoon solar convection.",
		instructions: [
			"Keep all exterior windows and doors tightly sealed from 6:00 AM to 11:00 AM and 6:00 PM to 10:00 PM.",
			"Check the ClearAir 'Best Window' forecast (typically 12:00 PM to 3:00 PM) when atmospheric mixing is highest.",
			"During the clean window, open opposing windows for 10–15 minutes for rapid air exchange, then seal immediately.",
			"Turn your air cleaner on high for 20 minutes following window closure.",
		],
		relevanceReason:
			"Zero cost; cuts baseline outdoor smog infiltration by over 40% compared to random window opening.",
	},
	{
		id: "wet-mopping",
		rank: 3,
		title: "Wet Mopping & Microfiber Dusting (Anti-Resuspension)",
		impactCategory: "medium",
		pm25ReductionPct: 35,
		estimatedCost: "free",
		summary:
			"Dry sweeping with brooms or vacuuming with non-HEPA vacuums resuspends settled toxic fine heavy-metal and carbon dust back into the breathing zone.",
		instructions: [
			"Replace dry broom sweeping with damp microfiber mopping once or twice daily.",
			"Use a damp microfiber cloth to wipe down high-traffic surfaces (tables, bed frames, shelves).",
			"Avoid running conventional upright vacuum cleaners unless equipped with a genuine certified sealed HEPA exhaust filter.",
			"Keep outdoor shoes strictly in an entryway rack outside the living envelope.",
		],
		relevanceReason:
			"Directly protects crawling toddlers and asthmatic members who breathe in resuspended floor dust.",
	},
	{
		id: "kitchen-exhaust-isolation",
		rank: 4,
		title: "Kitchen Exhaust & Compartment Sealing",
		impactCategory: "high",
		pm25ReductionPct: 60,
		estimatedCost: "free",
		summary:
			"Frying, tempering spices (tadka), and gas burners emit intense bursts of ultrafine particles (>500 µg/m³) and NO2 that spread throughout the home unless actively isolated.",
		instructions: [
			"Turn on the kitchen range hood / exhaust fan 1 minute before turning on the stove burner.",
			"Close the interior kitchen door leading to the bedrooms and living room while cooking.",
			"Crack the kitchen window slightly to create a negative pressure zone that draws cooking fumes outside.",
			"Keep the exhaust fan running for 10 minutes after cooking finishes.",
		],
		relevanceReason:
			"Prevents cooking combustion spikes from flooding children's and seniors' sleeping quarters.",
	},
	{
		id: "eliminate-combustion",
		rank: 5,
		title: "Eliminate Indoor Incense, Mosquito Coils & Candles",
		impactCategory: "high",
		pm25ReductionPct: 70,
		estimatedCost: "free",
		summary:
			"Burning a single mosquito coil or incense stick releases particulate emissions equivalent to smoking 75 to 100 cigarettes in an enclosed room.",
		instructions: [
			"Cease burning agarbatti / incense, dhoop, mosquito coils, and scented paraffin candles during winter smog months.",
			"Replace mosquito coils with physical window mesh screens, electric liquid vaporizers, or bed nets.",
			"For religious ceremonies, use LED lamps, electric diffusers, or place incense exclusively outdoors in a courtyard.",
			"Prohibit indoor cigarette or beedi smoking entirely.",
		],
		relevanceReason:
			"Immediate removal of the most intense point sources of indoor carcinogenic VOCs and PM2.5.",
	},
	{
		id: "mask-seal-fit",
		rank: 6,
		title: "Respirator Fit & Seal Tuning (Headband vs Ear Loop)",
		impactCategory: "medium",
		pm25ReductionPct: 90,
		estimatedCost: "low",
		summary:
			"A loose mask with gap leaks provides less than 30% real-world protection. A snug N95 or FFP2 respirator with headband straps filters over 95% of inhaled particles.",
		instructions: [
			"Select N95, KN95, or FFP2 respirators with two headband straps or use an ear-loop tightener clip behind the neck.",
			"Mold the metal nose clip firmly over the bridge of your nose using two fingers of each hand.",
			"Perform a positive pressure user seal check: gently exhale; if air leaks around the cheeks or eyes, readjust tension.",
			"Do not use surgical cloth masks or bandanas for winter smog: cloth weave pores (50–100 µm) cannot stop PM2.5 (2.5 µm).",
		],
		relevanceReason:
			"Critical for all household members during outdoor transit and commutes.",
	},
	{
		id: "door-sweep-sealing",
		rank: 7,
		title: "Door Sweep & Window Gap Sealing",
		impactCategory: "medium",
		pm25ReductionPct: 30,
		estimatedCost: "low",
		summary:
			"A 2 cm gap under your main entry door acts like a permanently cracked window, admitting corridor and street exhaust 24 hours a day.",
		instructions: [
			"Install a self-adhesive silicone door sweep or twin-draft fabric stopper under the main front door.",
			"Apply weatherstripping foam tape to drafty balcony sliding doors and unsealed window casements.",
			"In informal or leaky rooms, hang thick, heavy cotton or wool curtains over exterior window frames.",
			"Ensure balcony laundry access doors remain latched during high-smog mornings.",
		],
		relevanceReason:
			"Essential for apartments and older residences to reduce uncontrolled exterior airflow infiltration.",
	},
	{
		id: "bedroom-sanctuary",
		rank: 8,
		title: "Clean Air Bedroom Sanctuary Protocol",
		impactCategory: "high",
		pm25ReductionPct: 65,
		estimatedCost: "free",
		summary:
			"If you only have one air cleaner or filter, consolidate the family sleeping quarters into one sealed 'clean room' where the body can recover for 8 hours without toxic insult.",
		instructions: [
			"Select the bedroom with the fewest exterior openings and dedicate your primary air filter to it.",
			"Keep the bedroom door closed continuously throughout the day and night.",
			"Run the air purifier on high speed for 30 minutes before bedtime, then set to low/quiet mode for sleep.",
			"Do not bring outdoor outerwear, coats, or dusty work clothes into the clean sleeping sanctuary.",
		],
		relevanceReason:
			"Maximizes recovery of the cardiovascular and immune system during deep nocturnal rest.",
	},
];

/**
 * Rank and tailor indoor air quality hacks according to the household's profile and current AQI.
 *
 * @param profile Demographics and current equipment.
 * @param currentAqi Prevailing AQI value.
 * @returns Sorted array of AirHacks ranked by immediate impact and household relevance.
 */
export function rankIndoorHacks(
	profile: HouseholdProfile,
	currentAqi: number,
): readonly AirHack[] {
	// Score each hack based on household characteristics
	const scored = AIR_HACKS_CATALOG.map((hack) => {
		let priorityScore = 100 - hack.rank * 5;

		// If household does not have an air purifier, DIY filter becomes urgent #1
		if (hack.id === "diy-corsi-rosenthal") {
			if (!profile.hasAirPurifier) {
				priorityScore += 40;
			} else {
				priorityScore -= 20; // Already has purifier, lower priority
			}
		}

		// If family cooks with biomass or LPG, kitchen isolation and combustion elimination rise
		if (hack.id === "kitchen-exhaust-isolation") {
			if (profile.cookingFuel === "biomass" || profile.cookingFuel === "lpg") {
				priorityScore += 30;
			}
		}

		if (hack.id === "eliminate-combustion") {
			if (profile.cookingFuel === "biomass" || profile.smokerInHouse) {
				priorityScore += 35;
			}
		}

		// If home is leaky or an apartment
		if (hack.id === "door-sweep-sealing") {
			if (profile.homeType === "informal" || profile.homeType === "apartment") {
				priorityScore += 25;
			}
		}

		// If household has children, elderly, or asthma, bedroom sanctuary is top priority
		if (hack.id === "bedroom-sanctuary") {
			if (
				profile.childrenUnder12 > 0 ||
				profile.adultsOver65 > 0 ||
				profile.respiratoryCondition ||
				profile.pregnant
			) {
				priorityScore += 45;
			}
		}

		// If AQI is severe or hazardous
		if (currentAqi > 200) {
			if (
				hack.id === "timed-ventilation" ||
				hack.id === "bedroom-sanctuary" ||
				hack.id === "mask-seal-fit"
			) {
				priorityScore += 20;
			}
		}

		return {
			...hack,
			priorityScore,
		};
	});

	// Sort descending by priority score
	scored.sort((a, b) => b.priorityScore - a.priorityScore);

	// Re-assign ranks 1..N
	return scored.map((item, index) => ({
		id: item.id,
		rank: index + 1,
		title: item.title,
		impactCategory: item.impactCategory,
		pm25ReductionPct: item.pm25ReductionPct,
		estimatedCost: item.estimatedCost,
		summary: item.summary,
		instructions: item.instructions,
		relevanceReason: item.relevanceReason,
	}));
}
