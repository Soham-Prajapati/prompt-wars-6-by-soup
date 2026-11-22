import React from "react";
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
				<h2 id="exposure-heading" className="section-title">
					<span aria-hidden="true">🛡️</span>
					<span>Direct Inhaled Exposure Impact</span>
				</h2>

				<div className="exposure-banner">
					<div>
						<div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
							Estimated Personal PM2.5 Inhalation Reduction
						</div>
						<p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
							Calculated using EPA human inhalation volume (15 m³/day) and building infiltration modeling.
						</p>
					</div>
					<div className="exposure-pct">
						-{impact.netReductionPct}%
					</div>
				</div>

				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: "1rem",
						marginBottom: "1.25rem",
					}}
				>
					<div style={{ background: "var(--surface-raised)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
						<div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
							Unmitigated Baseline Inhaled Dose
						</div>
						<div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--aqi-unhealthy)" }}>
							{impact.baselineInhaledPm25UgDay} <span style={{ fontSize: "0.9rem" }}>µg / day</span>
						</div>
					</div>

					<div style={{ background: "var(--surface-raised)", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
						<div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
							With ClearAir Optimized Plan
						</div>
						<div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--aqi-good)" }}>
							{impact.optimizedInhaledPm25UgDay} <span style={{ fontSize: "0.9rem" }}>µg / day</span>
						</div>
					</div>
				</div>

				<h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem" }}>
					Cumulative Contribution per Protective Action:
				</h3>
				<ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
					{impact.factors.map((factor) => (
						<li
							key={factor.intervention}
							style={{
								fontSize: "0.85rem",
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								padding: "0.5rem 0.75rem",
								background: "var(--surface-raised)",
								borderRadius: "var(--radius-sm)",
							}}
						>
							<div>
								<strong>{factor.intervention}</strong>
								<div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
									{factor.mechanism}
								</div>
							</div>
							<span className="impact-pill" style={{ marginLeft: "0.75rem" }}>
								-{factor.relativeReductionPct}%
							</span>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
