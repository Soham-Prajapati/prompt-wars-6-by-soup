import React from "react";
import { Icon } from "@/components/Icon";
import type { ExposureImpact } from "@/lib/types";

interface ExposureImpactCardProps {
	readonly impact: ExposureImpact;
}

/** Render the modeled baseline, optimized dose, and contribution factors. */
export function ExposureImpactCard({
	impact,
}: ExposureImpactCardProps): React.JSX.Element {
	return (
		<section className="section" aria-labelledby="exposure-heading">
			<div className="card">
				<h2 id="exposure-heading" className="section-title"><Icon name="shield" /><span>See the difference the plan makes</span></h2>

				<div className="exposure-banner">
					<div>
						<div className="exposure-title">
							Estimated Personal PM2.5 Inhalation Reduction
						</div>
						<p className="section-intro">
							Calculated using EPA human inhalation volume (15 m³/day) and building infiltration modeling.
						</p>
					</div>
					<div className="exposure-pct">
						-{impact.netReductionPct}%
					</div>
				</div>

				<div className="dose-grid">
					<div className="dose-item">
						<div className="dose-label">
							Unmitigated Baseline Inhaled Dose
						</div>
						<div className="dose-value dose-risk">
							{impact.baselineInhaledPm25UgDay} <span style={{ fontSize: "0.9rem" }}>µg / day</span>
						</div>
					</div>

					<div className="dose-item">
						<div className="dose-label">
							With ClearAir Optimized Plan
						</div>
						<div className="dose-value dose-good">
							{impact.optimizedInhaledPm25UgDay} <span style={{ fontSize: "0.9rem" }}>µg / day</span>
						</div>
					</div>
				</div>

				<h3 className="subsection-title">
					Cumulative Contribution per Protective Action:
				</h3>
				<ul className="factor-list">
					{impact.factors.map((factor) => (
						<li
							key={factor.intervention}
							className="factor-item"
						>
							<div>
								<strong>{factor.intervention}</strong>
								<div className="timeline-subtext">
									{factor.mechanism}
								</div>
							</div>
							<span className="impact-number">
								-{factor.relativeReductionPct}%
							</span>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
