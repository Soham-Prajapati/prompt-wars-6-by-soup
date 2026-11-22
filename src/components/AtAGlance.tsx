import React from "react";
import { Icon } from "@/components/Icon";
import { firstSentence } from "@/lib/summary";
import type { CleanAirPlan, MemberRisk } from "@/lib/types";

interface AtAGlanceProps {
	readonly plan: CleanAirPlan;
}

function iconForRisk(tier: MemberRisk["riskTier"]): "leaf" | "spark" | "shield" {
	if (tier === "low") return "leaf";
	if (tier === "moderate") return "spark";
	return "shield";
}

function memberLabel(memberType: string): string {
	return memberType
		.replace(" (under 12)", "")
		.replace(" (over 65)", "")
		.replace("Pregnant family member", "Pregnant member")
		.replace("Asthma / COPD / Heart condition", "Respiratory condition")
		.replace("Healthy adults", "Adults");
}

function riskLabel(tier: MemberRisk["riskTier"]): string {
	return `${tier.charAt(0).toUpperCase()}${tier.slice(1)} risk`;
}

/** Keep the supporting numbers available without competing with the plan. */
export function AtAGlance({ plan }: AtAGlanceProps): React.JSX.Element {
	const topFactor = plan.exposureImpact.factors[0];

	return (
		<aside className="glance-rail" aria-labelledby="glance-heading">
			<div className="glance-rail-inner">
				<div className="section-kicker">A little more context</div>
				<h2 id="glance-heading">Your day at a glance</h2>
				<div className="glance-members" aria-label="Household members and risk levels">
					{plan.memberRisks.map((member) => (
						<div className={`glance-member risk-${member.riskTier}`} key={member.memberType}>
							<span>{memberLabel(member.memberType)}</span>
							<strong><Icon name={iconForRisk(member.riskTier)} size={15} />{riskLabel(member.riskTier)}</strong>
						</div>
					))}
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
