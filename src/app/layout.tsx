import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import React from "react";
import "./globals.css";

const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"], display: "swap" });
const display = Fraunces({ variable: "--font-display", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
	title: "ClearAir — Urban Air Quality & Smog Copilot",
	description:
		"GenAI-powered assistant that helps families and communities navigate severe winter smog and urban air pollution with low-emission routines and indoor hacks.",
};

export const viewport: Viewport = {
	colorScheme: "light dark",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#f3f1eb" },
		{ media: "(prefers-color-scheme: dark)", color: "#121614" },
	],
};

/** Render the accessible application shell and document language metadata. */
export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>): React.JSX.Element {
	return (
		<html lang="en">
			<body className={`${sans.variable} ${display.variable}`}>
				<a href="#main-content" className="skip-link">
					Skip to main content
				</a>
				{children}
			</body>
		</html>
	);
}
