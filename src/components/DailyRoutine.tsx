import React from "react";
import type { RoutineSegment } from "@/lib/types";

interface DailyRoutineProps {
	readonly routine: readonly RoutineSegment[];
}

export function DailyRoutine({ routine }: DailyRoutineProps): React.JSX.Element {
	return (
		<section className="section" aria-labelledby="routine-heading">
			<div className="card">
				<h2 id="routine-heading" className="section-title">
					<span aria-hidden="true">🗓️</span>
					<span>Timed Low-Emission Daily Routine</span>
				</h2>
				<p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
					Synchronized with solar boundary layer height and roadway smog peaks to shield your family.
				</p>

				<ol className="timeline">
					{routine.map((seg) => (
						<li key={seg.id} className="timeline-item">
							<div className="timeline-time">
								<div>{seg.timeSpan}</div>
								<div style={{ marginTop: "0.35rem" }}>
									<span
										className="badge"
										style={{
											fontSize: "0.7rem",
											backgroundColor: seg.outdoorActivityAllowed
												? "var(--aqi-good)"
												: "var(--surface-raised)",
											color: seg.outdoorActivityAllowed
												? "var(--accent-contrast)"
												: "var(--text-muted)",
										}}
									>
										{seg.outdoorActivityAllowed ? "Outdoor Allowed" : "Stay Indoors"}
									</span>
								</div>
							</div>

							<div className="timeline-action">
								<h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.25rem" }}>
									{seg.label}
								</h3>
								<p>{seg.actionDescription}</p>
								<div className="timeline-subtext">
									<strong>Ventilation:</strong> {seg.ventilationAdvice}
								</div>
								<div className="timeline-subtext">
									<strong>Targeted:</strong> {seg.targetedMembers.join(", ")}
								</div>
							</div>
						</li>
					))}
				</ol>
			</div>
		</section>
	);
}
