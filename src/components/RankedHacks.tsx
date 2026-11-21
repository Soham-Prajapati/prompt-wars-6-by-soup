import React from "react";
import type { AirHack } from "@/lib/types";

interface RankedHacksProps {
	readonly hacks: readonly AirHack[];
}

export function RankedHacks({ hacks }: RankedHacksProps): React.JSX.Element {
	return (
		<section className="section" aria-labelledby="hacks-heading">
			<div className="card">
				<h2 id="hacks-heading" className="section-title">
					<span aria-hidden="true">🛠️</span>
					<span>Ranked Indoor Air Hacks (Prioritized for Your Home)</span>
				</h2>
				<p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
					Science-backed, low-cost interventions ranked dynamically by effectiveness for your home setup.
				</p>

				<ol className="hacks-list">
					{hacks.map((hack) => (
						<li key={hack.id} className="hack-item">
							<div className="item-header">
								<h3>
									#{hack.rank} {hack.title}
								</h3>
								<div style={{ display: "flex", gap: "0.5rem" }}>
									<span className="impact-pill">
										-{hack.pm25ReductionPct}% PM2.5
									</span>
									<span className="badge" style={{ textTransform: "capitalize" }}>
										Cost: {hack.estimatedCost}
									</span>
								</div>
							</div>

							<p style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>
								{hack.summary}
							</p>

							<div
								style={{
									background: "var(--surface-raised)",
									padding: "0.75rem",
									borderRadius: "var(--radius-sm)",
									fontSize: "0.85rem",
								}}
							>
								<div style={{ fontWeight: 600, marginBottom: "0.35rem" }}>
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
