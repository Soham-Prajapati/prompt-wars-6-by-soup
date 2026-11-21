import type { Metadata } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
	title: "ClearAir — Urban Air Quality & Smog Copilot",
	description:
		"GenAI-powered assistant that helps families and communities navigate severe winter smog and urban air pollution with low-emission routines and indoor hacks.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>): React.JSX.Element {
	return (
		<html lang="en">
			<body>
				<a href="#main-content" className="skip-link">
					Skip to main content
				</a>
				{children}
			</body>
		</html>
	);
}
