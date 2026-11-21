import React from "react";

interface HeaderProps {
	readonly aiConfigured: boolean;
}

export function Header({ aiConfigured }: HeaderProps): React.JSX.Element {
	return (
		<header className="main-header" role="banner">
			<div className="logo-group">
				<h1>
					<span aria-hidden="true">🍃</span>
					<span>ClearAir</span>
				</h1>
				<p className="tagline">
					Urban Air Quality & Smog Copilot for Families and Communities
				</p>
			</div>
			<div>
				<span
					className="badge"
					role="status"
					title={
						aiConfigured
							? "Google Gemini model connected"
							: "Operating in deterministic science engine mode (no AI key needed)"
					}
				>
					<span
						style={{
							display: "inline-block",
							width: 8,
							height: 8,
							borderRadius: "50%",
							backgroundColor: aiConfigured ? "var(--aqi-good)" : "var(--aqi-moderate)",
						}}
						aria-hidden="true"
					/>
					{aiConfigured ? "Gemini AI Connected" : "Deterministic Engine Active"}
				</span>
			</div>
		</header>
	);
}
