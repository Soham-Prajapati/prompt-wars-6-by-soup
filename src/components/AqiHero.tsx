import React from "react";
import type { CleanAirPlan } from "@/lib/types";

interface AqiHeroProps {
	readonly plan: CleanAirPlan;
}

export function AqiHero({ plan }: AqiHeroProps): React.JSX.Element {
	const { currentAqi, currentBand, dominantPollutant, pollutants, memberRisks } = plan;

	const bandColorVar = `var(--aqi-${currentBand.code.replace("_", "-")})`;

	return (
		<section className="section" aria-labelledby="aqi-hero-heading">
			<div className="hero-aqi-card">
				<div className="aqi-gauge" style={{ borderColor: bandColorVar }}>
					<span className="aqi-number" style={{ color: bandColorVar }}>
						{currentAqi}
					</span>
					<span className="aqi-band-tag" style={{ color: bandColorVar }}>
						<span aria-hidden="true">{currentBand.icon}</span>
						<span>{currentBand.label}</span>
					</span>
					<span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
						EPA US AQI
					</span>
				</div>

				<div className="hero-details">
					<h2 id="aqi-hero-heading">
						Air Quality in {plan.location.name}: {currentBand.label}
					</h2>
					<p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
						{currentBand.description}
					</p>

					<div className="pollutant-grid">
						<div className="pollutant-pill">
							<span className="pollutant-name">Dominant ({dominantPollutant.name})</span>
							<span className="pollutant-value">
								{dominantPollutant.concentration} {dominantPollutant.unit}
							</span>
						</div>
						<div className="pollutant-pill">
							<span className="pollutant-name">PM2.5 (Fine Soot)</span>
							<span className="pollutant-value">{pollutants.pm25} µg/m³</span>
						</div>
						<div className="pollutant-pill">
							<span className="pollutant-name">PM10 (Dust)</span>
							<span className="pollutant-value">{pollutants.pm10} µg/m³</span>
						</div>
						<div className="pollutant-pill">
							<span className="pollutant-name">NO2 (Traffic)</span>
							<span className="pollutant-value">{pollutants.no2} µg/m³</span>
						</div>
					</div>

					{/* Member Risk Highlights */}
					{memberRisks.length > 0 && (
						<div style={{ marginTop: "1rem" }}>
							<h3 style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.35rem" }}>
								Family Health Directives:
							</h3>
							<ul style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
								{memberRisks.map((risk) => (
									<li
										key={risk.memberType}
										style={{
											fontSize: "0.85rem",
											display: "flex",
											alignItems: "baseline",
											gap: "0.4rem",
										}}
									>
										<span
											className="badge"
											style={{
												fontSize: "0.7rem",
												padding: "0.1rem 0.4rem",
												textTransform: "uppercase",
											}}
										>
											{risk.riskTier}
										</span>
										<span>
											<strong>{risk.memberType}:</strong> {risk.protectiveAction}
										</span>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
