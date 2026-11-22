import React from "react";
import { Icon } from "@/components/Icon";
import { firstSentence, selectSummaryFacts } from "@/lib/summary";
import type { CleanAirPlan } from "@/lib/types";

interface AtAGlanceProps {
	readonly plan: CleanAirPlan;
}

/** Keep the supporting numbers available without competing with the plan. */
export function AtAGlance({ plan }: AtAGlanceProps): React.JSX.Element {
	const facts = selectSummaryFacts(plan);
	const topFactor = plan.exposureImpact.factors[0];

	return (
		<aside className="glance-rail" aria-labelledby="glance-heading">
			<div className="glance-rail-inner">
				<div className="section-kicker">A little more context</div>
				<h2 id="glance-heading">Your day at a glance</h2>
				<div className="glance-reading">
					<span className="glance-reading-label">Current air</span>
					<strong>{plan.currentAqi} <span>AQI</span></strong>
					<span>{plan.currentBand.label} · {plan.dominantPollutant.name} is leading</span>
				</div>
				<div className="glance-list">
					<div><span>Best window</span><strong>{facts[0]?.value}</strong></div>
					<div><span>Top move</span><strong>{facts[2]?.note}</strong></div>
					<div><span>Exposure cut</span><strong>{facts[3]?.value}</strong></div>
				</div>
				<details className="glance-details">
					<summary>How the estimate works</summary>
					<p>{firstSentence(topFactor?.mechanism ?? "The plan combines timing, filtration, and lower-exposure choices.")}</p>
					<div className="dose-compare">
						<span>Without the plan<strong>{plan.exposureImpact.baselineInhaledPm25UgDay} µg/day</strong></span>
						<span>With the plan<strong>{plan.exposureImpact.optimizedInhaledPm25UgDay} µg/day</strong></span>
					</div>
				</details>
				<p className="glance-footnote"><Icon name="shield" size={14} /> {plan.exposureImpact.factors.length} protective inputs are included in the estimate.</p>
			</div>
		</aside>
	);
}
