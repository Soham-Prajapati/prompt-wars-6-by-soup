import React from "react";
import { Icon } from "@/components/Icon";
import type { CleanAirPlan } from "@/lib/types";

interface AqiHeroProps {
	readonly plan: CleanAirPlan;
}

function bandTone(code: string): string {
	if (code === "unhealthy_sensitive") return "sensitive";
	return code.replaceAll("_", "-");
}

/** Present the current AQI, pollutant readings, and household directives. */
export function AqiHero({ plan }: AqiHeroProps): React.JSX.Element {
	const { currentAqi, currentBand, dominantPollutant, pollutants, memberRisks } = plan;
	const bandColorVar = `var(--aqi-${bandTone(currentBand.code)})`;

	return (
		<section className="section hero-section" aria-labelledby="aqi-hero-heading">
			<div className="hero-aqi-card">
				<div className="aqi-gauge" style={{ borderColor: bandColorVar }}>
					<span className="aqi-kicker">Current US AQI</span>
					<span className="aqi-number" style={{ color: bandColorVar }}>{currentAqi}</span>
					<span className="aqi-band-tag" style={{ color: bandColorVar }}><Icon name="shield" size={18} /><span>{currentBand.label}</span></span>
					<span className="aqi-source">EPA US AQI</span>
				</div>

				<div className="hero-details">
					<p className="hero-context">Morning read · {plan.location.name}</p>
					<h2 id="aqi-hero-heading">Plan a lighter day outdoors.</h2>
					<p className="hero-description">{currentBand.description} The plan below turns that reading into clear timing, indoor actions, and family-specific protection.</p>

					<div className="pollutant-grid" aria-label="Current pollutant readings">
						<div className="pollutant-pill"><span className="pollutant-name">Dominant · {dominantPollutant.name}</span><span className="pollutant-value">{dominantPollutant.concentration} {dominantPollutant.unit}</span></div>
						<div className="pollutant-pill"><span className="pollutant-name">PM2.5 · fine soot</span><span className="pollutant-value">{pollutants.pm25} µg/m³</span></div>
						<div className="pollutant-pill"><span className="pollutant-name">PM10 · dust</span><span className="pollutant-value">{pollutants.pm10} µg/m³</span></div>
						<div className="pollutant-pill"><span className="pollutant-name">NO2 · traffic</span><span className="pollutant-value">{pollutants.no2} µg/m³</span></div>
					</div>

					{memberRisks.length > 0 && <div className="directive-list"><h3>Family health directives</h3><ul>{memberRisks.map((risk) => <li key={risk.memberType}><span className="directive-marker" aria-hidden="true" /><span><strong>{risk.memberType}:</strong> {risk.protectiveAction}</span></li>)}</ul></div>}
				</div>
			</div>
		</section>
	);
}
