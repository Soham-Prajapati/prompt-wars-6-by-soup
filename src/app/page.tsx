"use client";

import React, { useEffect, useState, useTransition } from "react";
import { AiBriefing } from "@/components/AiBriefing";
import { AtAGlance } from "@/components/AtAGlance";
import { AqiHero } from "@/components/AqiHero";
import { ForecastStrip } from "@/components/ForecastStrip";
import { Header } from "@/components/Header";
import { LocationPicker } from "@/components/LocationPicker";
import { PlanTabs } from "@/components/PlanTabs";
import { ProfileForm } from "@/components/ProfileForm";
import { TodaySummary } from "@/components/TodaySummary";
import { fetchCleanAirPlan } from "@/lib/client";
import { DEFAULT_PROFILE } from "@/lib/profile";
import type { CleanAirPlan, GeoLocation, HouseholdProfile } from "@/lib/types";

const INITIAL_LOCATION: GeoLocation = {
	id: 1273294,
	name: "New Delhi",
	country: "India",
	admin1: "National Capital Territory of Delhi",
	latitude: 28.6139,
	longitude: 77.209,
	timezone: "Asia/Kolkata",
};

/** Render the single-screen ClearAir briefing workflow. */
export default function HomePage(): React.JSX.Element {
	const [location, setLocation] = useState<GeoLocation>(INITIAL_LOCATION);
	const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_PROFILE);
	const [plan, setPlan] = useState<CleanAirPlan | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [aiConfigured, setAiConfigured] = useState(false);
	const [, startTransition] = useTransition();

	// Check system health and whether the narration service is configured.
	useEffect(() => {
		fetch("/api/health")
			.then((res) => res.json())
			.then((data: { aiConfigured?: boolean }) => {
				setAiConfigured(Boolean(data.aiConfigured));
			})
			.catch(() => {
				setAiConfigured(false);
			});
	}, []);

	// Load plan whenever location or profile changes
	useEffect(() => {
		let isCancelled = false;
		setIsLoading(true);
		setError(null);

		fetchCleanAirPlan(location, profile)
			.then((computedPlan) => {
				if (!isCancelled) {
					startTransition(() => {
						setPlan(computedPlan);
						setIsLoading(false);
					});
				}
			})
			.catch(() => {
				if (!isCancelled) {
					setError(
						"Unable to load live meteorological data from Open-Meteo. Please verify your connection or try again shortly.",
					);
					setIsLoading(false);
				}
			});

		return (): void => {
			isCancelled = true;
		};
	}, [location, profile]);

	return (
		<div className="app-shell">
			<Header aiConfigured={aiConfigured} />

			<main id="main-content" aria-busy={isLoading}>
				<section className="context-bar" aria-label="Planning context">
					<LocationPicker
						currentLocation={location}
						onLocationSelect={(newLoc: GeoLocation): void => {
							setLocation(newLoc);
						}}
						isLoading={isLoading}
					/>
					<ProfileForm
						initialProfile={profile}
						onProfileChange={(newProf: HouseholdProfile): void => {
							setProfile(newProf);
						}}
						isLoading={isLoading}
					/>
				</section>

				{error !== null && (
					<div className="error-state" role="alert">
						<p>{error}</p>
					</div>
				)}

				{isLoading && plan === null && (
					<div className="loading-state" role="status"><span className="loading-pulse" aria-hidden="true" /><p>Reading the air and shaping today’s plan…</p></div>
				)}

				{plan !== null && (
					<>
						<AqiHero plan={plan} />
						<TodaySummary plan={plan} />

						<ForecastStrip
							forecast={plan.forecast24h}
							bestWindow={plan.bestWindow}
						/>

						<div className="plan-layout">
							<PlanTabs plan={plan} />
							<AtAGlance plan={plan} />
						</div>

						<AiBriefing plan={plan} profile={profile} />
					</>
				)}
			</main>

			<footer className="footer-copy" role="contentinfo">
				<div>
					<strong>ClearAir</strong> — Built for PromptWars Challenge 6. Grounded decision engine with optional AI narration.
				</div>
				<div>
					Sources & Standards: EPA 40 CFR Part 58 (AQI Tables), WHO 2021 Global Air Quality Guidelines, UC Davis Corsi-Rosenthal Filtration Studies, FTA Greenhouse Gas Transit Factors.
				</div>
				<div>
					Privacy: No telemetry, no third-party tracking cookies. Weather data via Open-Meteo API (keyless, server-cached).
				</div>
			</footer>
		</div>
	);
}
