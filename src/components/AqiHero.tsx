import React from "react";
import { FamilyChips } from "@/components/FamilyChips";
import { Icon } from "@/components/Icon";
import { getSkyPalette } from "@/lib/sky";
import type { CleanAirPlan } from "@/lib/types";

interface AqiHeroProps {
	readonly plan: CleanAirPlan;
}

/** Let the live AQI tint the atmosphere while keeping the number readable. */
export function AqiHero({ plan }: AqiHeroProps): React.JSX.Element {
	const { currentAqi, currentBand, dominantPollutant, pollutants, memberRisks } = plan;
	const palette = getSkyPalette(currentAqi);
	const skyStyle = {
		"--sky-start": palette.start,
		"--sky-mid": palette.mid,
		"--sky-end": palette.end,
		"--sky-fog": palette.fog,
		"--sky-ink": palette.foreground,
		"--sky-muted": palette.muted,
	} as React.CSSProperties;

	return (
		<section className="section hero-section" aria-labelledby="aqi-hero-heading">
			<div className="sky-hero" style={skyStyle}>
				<div className="sky-grain" aria-hidden="true" />
				<div className="sky-topline"><span className="sky-eyebrow">Live air read</span><span>{plan.location.name}, {plan.location.country} · EPA US AQI</span></div>
				<div className="sky-reading">
					<div className="aqi-number" aria-label={`Current US AQI ${String(currentAqi)}`}>{currentAqi}</div>
					<div className="sky-status">
						<div className="sky-band"><Icon name="shield" size={18} /><strong>{currentBand.label}</strong></div>
						<h2 id="aqi-hero-heading">Plan a lighter day outdoors.</h2>
						<p>{currentBand.description} ClearAir has turned this reading into the few decisions that matter for your family today.</p>
					</div>
				</div>
				<div className="sky-footer">
					<FamilyChips members={memberRisks} />
					<div className="pollutant-inline" aria-label="Current pollutant readings">
						<span>Leading <strong>{dominantPollutant.name} {dominantPollutant.concentration} {dominantPollutant.unit}</strong></span>
						<span>PM2.5 <strong>{pollutants.pm25} µg/m³</strong></span>
						<span>NO₂ <strong>{pollutants.no2} µg/m³</strong></span>
					</div>
				</div>
			</div>
		</section>
	);
}
