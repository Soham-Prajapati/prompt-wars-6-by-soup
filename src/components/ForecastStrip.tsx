"use client";

import React, { useState } from "react";
import { Icon } from "@/components/Icon";
import type { BestOutdoorWindow, HourlyForecastPoint } from "@/lib/types";

interface ForecastStripProps {
	readonly forecast: readonly HourlyForecastPoint[];
	readonly bestWindow: BestOutdoorWindow;
}

function toneForBand(code: string): string {
	return code === "unhealthy_sensitive" ? "sensitive" : code.replaceAll("_", "-");
}

const MIN_BAR_HEIGHT_PERCENT = 25;

function relativeBarHeight(aqi: number, dayMin: number, dayMax: number): number {
	if (dayMax <= dayMin) return 100;

	const relativePosition = (aqi - dayMin) / (dayMax - dayMin);
	return Math.min(100, Math.max(MIN_BAR_HEIGHT_PERCENT, Math.round(MIN_BAR_HEIGHT_PERCENT + relativePosition * (100 - MIN_BAR_HEIGHT_PERCENT))));
}

/** Present the forecast as a visual strip with a text-table alternative. */
export function ForecastStrip({ forecast, bestWindow }: ForecastStripProps): React.JSX.Element {
	const [showTableView, setShowTableView] = useState(false);
	const aqiValues = forecast.map((point) => point.usAqi);
	const dayMinAqi = aqiValues.length > 0 ? Math.min(...aqiValues) : 0;
	const dayMaxAqi = aqiValues.length > 0 ? Math.max(...aqiValues) : 0;

	return (
		<section className="section" aria-labelledby="forecast-heading">
			<div className="forecast-panel">
				<div className="section-heading-row">
					<div><div className="section-kicker">The next 24 hours</div><h2 id="forecast-heading" className="section-title"><Icon name="window" /><span>Find the clearer window</span></h2><p className="section-intro">Relative air-quality levels, with the best stretch called out.</p></div>
					<button type="button" className="btn btn-secondary compact-button" onClick={() => { setShowTableView(!showTableView); }} aria-pressed={showTableView}>{showTableView ? "Show strip" : "Show table"}</button>
				</div>

				<div className="window-callout"><span className="callout-icon"><Icon name="spark" size={17} /></span><span><strong>{bestWindow.startHour}–{bestWindow.endHour}</strong> is the best outdoor window · average AQI {bestWindow.averageAqi}. {bestWindow.recommendation}</span></div>

				{showTableView ? (
					<div className="table-wrap"><table className="forecast-table" aria-label="24-hour hourly air quality forecast data"><thead><tr><th>Hour</th><th>US AQI</th><th>Band</th><th>PM2.5</th><th>Best window</th></tr></thead><tbody>{forecast.map((point) => <tr key={point.timestamp} className={point.isBestWindow ? "is-best" : undefined}><td>{point.hourLabel}</td><td><strong>{point.usAqi}</strong></td><td>{point.bandLabel}</td><td>{point.pm25} µg/m³</td><td>{point.isBestWindow ? "Best" : "—"}</td></tr>)}</tbody></table></div>
				) : (
					<div className="forecast-scroll" role="region" aria-label="Hourly forecast strip">
						{forecast.length === 0 ? <p className="empty-state">No hourly forecast is available yet.</p> : forecast.map((point, index) => {
							const height = `${String(relativeBarHeight(point.usAqi, dayMinAqi, dayMaxAqi))}%`;
							const tone = toneForBand(point.bandCode);
			const isCurrent = index === 0;
			const showHour = index % 3 === 0;
			return <div key={point.timestamp} className={`forecast-column ${point.isBestWindow ? "is-best" : ""} ${isCurrent ? "is-current" : ""}`} title={`${point.hourLabel}: AQI ${String(point.usAqi)} (${point.bandLabel})`} aria-label={`${point.hourLabel}: AQI ${String(point.usAqi)}, ${point.bandLabel}${point.isBestWindow ? ", best outdoor window" : ""}${isCurrent ? ", current hour" : ""}`}><span className="forecast-hour">{isCurrent ? "Now" : showHour ? point.hourLabel : "·"}</span><div className="forecast-track"><span className="forecast-bar" style={{ height, backgroundColor: `var(--aqi-${tone})` }} /></div><strong className="forecast-aqi">{point.usAqi}</strong>{point.isBestWindow && index === forecast.findIndex((item) => item.isBestWindow) && <span className="best-badge">Best window</span>}</div>;
			})}
					</div>
				)}
			</div>
		</section>
	);
}
