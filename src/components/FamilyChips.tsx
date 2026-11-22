import React from "react";
import { Icon } from "@/components/Icon";
import type { MemberRisk } from "@/lib/types";

interface FamilyChipsProps {
		readonly members: readonly MemberRisk[];
}

function iconForRisk(tier: MemberRisk["riskTier"]): "leaf" | "spark" | "shield" {
	if (tier === "low") return "leaf";
	if (tier === "moderate") return "spark";
	return "shield";
}

/** Turn the household risk model into a quick, human-readable family row. */
export function FamilyChips({ members }: FamilyChipsProps): React.JSX.Element {
	return (
		<div className="family-row" aria-label="Household risk levels">
			<span className="family-row-label">Your household</span>
			<div className="family-chips">
				{members.map((member) => (
					<div className={`family-chip risk-${member.riskTier}`} key={member.memberType}>
						<span className="family-chip-icon"><Icon name={iconForRisk(member.riskTier)} size={15} /></span>
						<span className="family-chip-copy">
							<strong>{member.memberType.replace(" (under 12)", "").replace(" (over 65)", "")}</strong>
							<span>{member.riskTier} risk</span>
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
