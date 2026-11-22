import React from "react";
import { Icon } from "@/components/Icon";
import type { AirHack } from "@/lib/types";

interface RankedHacksProps {
	readonly hacks: readonly AirHack[];
}

/** Render ranked indoor interventions with their estimated PM2.5 impact. */
export function RankedHacks({ hacks }: RankedHacksProps): React.JSX.Element {
	return (
		<section className="section" aria-labelledby="hacks-heading">
			<div className="card">
				<h2 id="hacks-heading" className="section-title"><Icon name="tools" /><span>Small changes, visible impact</span></h2>
				<p className="section-intro">
					Science-backed, low-cost interventions ranked dynamically by effectiveness for your home setup.
				</p>

				<ol className="hacks-list">
					{hacks.map((hack) => (
						<li key={hack.id} className="hack-item">
							<div className="item-header">
								<h3>
									<span className="item-rank">{String(hack.rank).padStart(2, "0")}</span> {hack.title}
								</h3>
								<div className="item-metrics">
									<span className="impact-number">
										-{hack.pm25ReductionPct}% PM2.5
									</span>
									<span className="badge">
										Cost: {hack.estimatedCost}
									</span>
								</div>
							</div>

							<p className="item-summary">
								{hack.summary}
							</p>

							<div className="instruction-list">
								<div className="list-label">
									Action Steps:
								</div>
								<ul style={{ listStyleType: "disc", paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
									{hack.instructions.map((inst, i) => (
										<li key={i}>{inst}</li>
									))}
								</ul>
							</div>
						</li>
					))}
				</ol>
			</div>
		</section>
	);
}
