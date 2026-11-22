import type { CleanAirPlan } from "@/lib/types";

export interface SummaryFact {
	readonly id: "window" | "risk" | "action" | "exposure";
	readonly label: string;
	readonly value: string;
	readonly note: string;
}

/** Keep the first scan useful without losing the detailed plan below it. */
export function firstSentence(text: string): string {
	const sentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim();
	return sentence ?? text.trim();
}

function riskLabel(tier: string): string {
	return `${tier.charAt(0).toUpperCase()}${tier.slice(1)} risk`;
}

/** Select the four facts that should be visible before the user opens any detail. */
export function selectSummaryFacts(plan: CleanAirPlan): readonly SummaryFact[] {
	const riskiest = [...plan.memberRisks].sort((a, b) => {
		const rank: Record<string, number> = { low: 0, moderate: 1, high: 2, severe: 3, critical: 4 };
		return (rank[b.riskTier] ?? 0) - (rank[a.riskTier] ?? 0);
	})[0] ?? plan.memberRisks[0];
	const topHack = plan.rankedHacks[0];

	return [
		{
			id: "window",
			label: "Best outdoor window",
			value: `${plan.bestWindow.startHour}–${plan.bestWindow.endHour}`,
			note: `Average AQI ${String(plan.bestWindow.averageAqi)}`,
		},
		{
			id: "risk",
			label: "Keep the closest eye on",
			value: riskiest?.memberType ?? "Your household",
			note: riskiest ? riskLabel(riskiest.riskTier) : "Low household risk",
		},
		{
			id: "action",
			label: "Highest-impact move",
			value: topHack?.title ?? "Follow the routine",
			note: topHack ? `Estimated −${String(topHack.pm25ReductionPct)}% PM2.5` : "Start with the best window",
		},
		{
			id: "exposure",
			label: "Estimated exposure cut",
			value: `−${String(plan.exposureImpact.netReductionPct)}%`,
			note: "With the ClearAir plan",
		},
	];
}
