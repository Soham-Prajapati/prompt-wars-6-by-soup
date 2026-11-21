"use client";

import React, { useEffect, useState, useTransition } from "react";
import { AiBriefing } from "@/components/AiBriefing";
import { AlternativesList } from "@/components/AlternativesList";
import { AqiHero } from "@/components/AqiHero";
import { DailyRoutine } from "@/components/DailyRoutine";
import { ExposureImpactCard } from "@/components/ExposureImpactCard";
import { ForecastStrip } from "@/components/ForecastStrip";
import { Header } from "@/components/Header";
import { LocationPicker } from "@/components/LocationPicker";
import { ProfileForm } from "@/components/ProfileForm";
import { RankedHacks } from "@/components/RankedHacks";
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

export default function HomePage(): React.JSX.Element {
	const [location, setLocation] = useState<GeoLocation>(INITIAL_LOCATION);
	const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_PROFILE);
	const [plan, setPlan] = useState<CleanAirPlan | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [aiConfigured, setAiConfigured] = useState(false);
	const [, startTransition] = useTransition();

	// Check system health and whether Gemini key is set
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
		<div className="container">
			<Header aiConfigured={aiConfigured} />

			<main id="main-content">
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

				{error !== null && (
					<div
						className="card"
						style={{
							backgroundColor: "var(--surface)",
							borderColor: "var(--aqi-unhealthy)",
							marginBottom: "2rem",
						}}
						role="alert"
					>
						<p style={{ color: "var(--aqi-unhealthy)", fontWeight: 600 }}>{error}</p>
					</div>
				)}

				{isLoading && plan === null && (
					<div
						className="card"
						style={{ textAlign: "center", padding: "3rem 1rem", marginBottom: "2rem" }}
						role="status"
					>
						<p style={{ fontSize: "1.1rem", fontWeight: 600 }}>
							Retrieving atmospheric readings and calculating low-emission plan...
						</p>
					</div>
				)}

				{plan !== null && (
					<>
						<AqiHero plan={plan} />

						<ForecastStrip
							forecast={plan.forecast24h}
							bestWindow={plan.bestWindow}
						/>

						<DailyRoutine routine={plan.dailyRoutine} />

						<RankedHacks hacks={plan.rankedHacks} />

						<AlternativesList alternatives={plan.alternatives} />

						<ExposureImpactCard impact={plan.exposureImpact} />

						<AiBriefing plan={plan} profile={profile} />
					</>
				)}
			</main>

			<footer
				style={{
					borderTop: "1px solid var(--border)",
					marginTop: "3rem",
					paddingTop: "1.5rem",
					fontSize: "0.85rem",
					color: "var(--text-muted)",
					display: "flex",
					flexDirection: "column",
					gap: "0.5rem",
				}}
				role="contentinfo"
			>
				<div>
					<strong>ClearAir</strong> — Built for PromptWars Challenge 6. Grounded deterministic science engine with Google Gemini GenAI narration.
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
