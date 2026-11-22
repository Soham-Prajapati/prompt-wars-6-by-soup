import React from "react";
import { Icon } from "@/components/Icon";
import type { SustainableAlternative } from "@/lib/types";

interface AlternativesListProps {
	readonly alternatives: readonly SustainableAlternative[];
}

/** Render sustainable alternatives and their named impact estimates. */
export function AlternativesList({
	alternatives,
}: AlternativesListProps): React.JSX.Element {
	if (alternatives.length === 0) {
		return <></>;
	}

	return (
		<section className="section" aria-labelledby="alts-heading">
			<div className="card">
				<h2 id="alts-heading" className="section-title"><Icon name="leaf" /><span>Cleaner alternatives, counted</span></h2>
				<p className="section-intro">
					Direct emissions avoided by transitioning commute, cooking, or heating to clean alternatives.
				</p>

				<div className="alts-list">
					{alternatives.map((alt) => (
						<article key={alt.id} className="alt-item">
							<div className="item-header">
								<h3>{alt.title}</h3>
								<div className="item-metrics">
									{alt.co2AvoidedKgWeekly > 0 && (
										<span className="impact-number">
											-{alt.co2AvoidedKgWeekly} kg CO2 / week
										</span>
									)}
									{alt.pm25AvoidedGramsWeekly > 0 && (
										<span className="impact-number">
											-{alt.pm25AvoidedGramsWeekly} g PM2.5 / week
										</span>
									)}
									{alt.indoorPm25ReductionPct > 0 && (
										<span className="impact-number">
											-{alt.indoorPm25ReductionPct}% Indoor PM2.5
										</span>
									)}
								</div>
							</div>

							<div className="choice-line">
								<span style={{ color: "var(--text-muted)" }}>Current choice:</span>{" "}
								<strong>{alt.currentOption}</strong> →{" "}
								<span style={{ color: "var(--text-muted)" }}>Clean alternative:</span>{" "}
								<strong>{alt.proposedOption}</strong>
							</div>

							<p className="item-summary">
								{alt.rationale}
							</p>

							<p className="evidence-line">
								<em>Source & Evidence: {alt.scientificBasis}</em>
							</p>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}
