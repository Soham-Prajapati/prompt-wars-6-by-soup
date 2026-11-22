import React from "react";
import { Icon } from "@/components/Icon";
import type { RoutineSegment } from "@/lib/types";

interface DailyRoutineProps {
	readonly routine: readonly RoutineSegment[];
}

/** Render the computed timed routine as an ordered timeline. */
export function DailyRoutine({ routine }: DailyRoutineProps): React.JSX.Element {
	return (
		<section className="section" aria-labelledby="routine-heading">
			<div className="card">
				<h2 id="routine-heading" className="section-title"><Icon name="calendar" /><span>Let the day have a rhythm</span></h2>
				<p className="section-intro">
					Synchronized with solar boundary layer height and roadway smog peaks to shield your family.
				</p>

				<ol className="timeline">
					{routine.map((seg) => (
						<li key={seg.id} className="timeline-item">
							<div className="timeline-time">
								<div>{seg.timeSpan}</div>
								<span className={`timeline-status ${seg.outdoorActivityAllowed ? "is-open" : "is-closed"}`}>{seg.outdoorActivityAllowed ? "Outdoor window" : "Stay indoors"}</span>
							</div>

							<div className="timeline-action">
								<h3>
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
