import React from "react";
import { selectSummaryFacts } from "@/lib/summary";
import type { CleanAirPlan } from "@/lib/types";

interface TodaySummaryProps {
	readonly plan: CleanAirPlan;
}

/** Put the few decisions worth remembering above the full plan. */
export function TodaySummary({ plan }: TodaySummaryProps): React.JSX.Element {
	const facts = selectSummaryFacts(plan);

	return (
		<section className="today-summary section" aria-labelledby="today-summary-heading">
			<div className="section-kicker" id="today-summary-heading">Today, at a glance</div>
			<div className="summary-facts">
				{facts.map((fact, index) => (
					<div className={`summary-fact summary-fact-${fact.id}`} key={fact.id}>
						<span className="fact-index">0{index + 1}</span>
						<span className="fact-label">{fact.label}</span>
						<strong className="fact-value">{fact.value}</strong>
						<span className="fact-note">{fact.note}</span>
					</div>
				))}
			</div>
		</section>
	);
}
