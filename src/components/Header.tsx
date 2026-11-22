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
					<span className="brand-mark"><Icon name="leaf" size={20} /></span>
					<span>ClearAir</span>
				</h1>
				<p className="tagline">
					A calmer way to plan the day around the air.
				</p>
			</div>
			<div>
				<span
					className="badge"
					role="status"
					aria-label={aiConfigured ? "AI connected" : "AI connected, deterministic fallback active"}
					title={
						aiConfigured
							? "The narration service is connected."
							: "The deterministic science guide is ready while AI narration is unavailable."
					}
				>
					<span className={`status-dot ${aiConfigured ? "is-connected" : "is-fallback"}`} aria-hidden="true" />
					AI connected
				</span>
			</div>
		</header>
	);
}
