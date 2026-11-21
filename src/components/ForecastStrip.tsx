"use client";

import React, { useState } from "react";
import type { BestOutdoorWindow, HourlyForecastPoint } from "@/lib/types";

interface ForecastStripProps {
	readonly forecast: readonly HourlyForecastPoint[];
	readonly bestWindow: BestOutdoorWindow;
}

export function ForecastStrip({
	forecast,
	bestWindow,
}: ForecastStripProps): React.JSX.Element {
	const [showTableView, setShowTableView] = useState(false);

	return (
		<section className="section" aria-labelledby="forecast-heading">
			<div className="card">
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
					<div>
						<h2 id="forecast-heading" className="section-title" style={{ marginBottom: "0.25rem" }}>
							<span aria-hidden="true">⏱️</span>
							<span>24-Hour Air Quality Outlook & Best Window</span>
						</h2>
						<p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
							Lowest smog window today: <strong>{bestWindow.startHour} to {bestWindow.endHour}</strong> (Average AQI: {bestWindow.averageAqi}).
						</p>
					</div>
					<button
						type="button"
						className="btn btn-secondary"
						style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}
						onClick={() => {
							setShowTableView(!showTableView);
						}}
						aria-pressed={showTableView}
					>
						{showTableView ? "Show Visual Strip" : "Show Accessible Table"}
					</button>
				</div>

				<div
					style={{
						background: "var(--surface-raised)",
						padding: "0.75rem 1rem",
						borderRadius: "var(--radius-sm)",
						border: "1px solid var(--border)",
						marginBottom: "1rem",
						fontSize: "0.9rem",
					}}
				>
					<span aria-hidden="true">💡 </span>
					<strong>Ventilation & Errands Guidance:</strong> {bestWindow.recommendation}
				</div>

				{showTableView ? (
					<div style={{ overflowX: "auto" }}>
						<table
							style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}
							aria-label="24-hour hourly air quality forecast data"
						>
							<thead>
								<tr style={{ borderBottom: "1px solid var(--border-strong)" }}>
									<th style={{ padding: "0.5rem" }}>Hour</th>
									<th style={{ padding: "0.5rem" }}>US AQI</th>
									<th style={{ padding: "0.5rem" }}>Band</th>
									<th style={{ padding: "0.5rem" }}>PM2.5 (µg/m³)</th>
									<th style={{ padding: "0.5rem" }}>Best Window</th>
								</tr>
							</thead>
							<tbody>
								{forecast.map((pt) => (
									<tr
										key={pt.timestamp}
										style={{
											borderBottom: "1px solid var(--border)",
											backgroundColor: pt.isBestWindow ? "var(--surface-raised)" : "transparent",
										}}
									>
										<td style={{ padding: "0.5rem", fontFamily: "var(--font-mono)" }}>{pt.hourLabel}</td>
										<td style={{ padding: "0.5rem", fontWeight: 700 }}>{pt.usAqi}</td>
										<td style={{ padding: "0.5rem" }}>{pt.bandLabel}</td>
										<td style={{ padding: "0.5rem" }}>{pt.pm25}</td>
										<td style={{ padding: "0.5rem" }}>{pt.isBestWindow ? "★ Prime Window" : "—"}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<div className="forecast-scroll" role="region" aria-label="Hourly forecast strip">
						{forecast.map((point) => {
							const bandColorVar = `var(--aqi-${point.bandCode.replace("_", "-")})`;
							return (
								<div
									key={point.timestamp}
									className={`forecast-card ${point.isBestWindow ? "is-best" : ""}`}
									title={`${point.hourLabel}: AQI ${String(point.usAqi)} (${point.bandLabel})`}
								>
									<span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
										{point.hourLabel}
									</span>
									<span
										style={{
											fontSize: "1.25rem",
											fontWeight: 800,
											color: bandColorVar,
										}}
									>
										{point.usAqi}
									</span>
									<span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
										{point.bandLabel}
									</span>
									{point.isBestWindow && (
										<span className="best-badge">Best</span>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</section>
	);
}
