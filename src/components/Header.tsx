import React from "react";
import { Icon } from "@/components/Icon";

interface HeaderProps {
	readonly aiConfigured: boolean;
}

/** Show the ClearAir identity and current narration mode. */
export function Header({ aiConfigured }: HeaderProps): React.JSX.Element {
	return (
		<header className="main-header" role="banner">
			<div className="logo-group">
				<h1>
					<span className="brand-mark"><Icon name="leaf" size={19} /></span>
					<span>ClearAir</span>
				</h1>
				<p className="tagline">Your family’s air, made easier to act on.</p>
			</div>
			<div>
				<span
					className="service-status"
					role="status"
					aria-label={aiConfigured ? "AI narration available" : "Science guide active"}
					title={
						aiConfigured
							? "The narration service is connected."
							: "The deterministic science guide is ready while AI narration is unavailable."
					}
				>
					<span className={`status-dot ${aiConfigured ? "is-connected" : "is-fallback"}`} aria-hidden="true" />
					{aiConfigured ? "AI narration available" : "Science guide active"}
				</span>
			</div>
		</header>
	);
}
