"use client";

import React, { useState } from "react";
import { searchLocationsClient } from "@/lib/client";
import type { GeoLocation } from "@/lib/types";

interface LocationPickerProps {
	readonly currentLocation: GeoLocation;
	readonly onLocationSelect: (location: GeoLocation) => void;
	readonly isLoading: boolean;
}

/** Provide city search and browser-geolocation controls. */
export function LocationPicker({
	currentLocation,
	onLocationSelect,
	isLoading,
}: LocationPickerProps): React.JSX.Element {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<readonly GeoLocation[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSearch = async (e: React.SyntheticEvent): Promise<void> => {
		e.preventDefault();
		if (query.trim().length < 2) return;

		setIsSearching(true);
		setError(null);
		try {
			const found = await searchLocationsClient(query);
			setResults(found);
			if (found.length === 0) {
				setError("No matching cities found. Please try another name.");
			}
		} catch {
			setError("Failed to search location. Please check your connection.");
		} finally {
			setIsSearching(false);
		}
	};

	const handleGeolocation = (): void => {
		if (typeof window === "undefined" || !("geolocation" in navigator)) {
			setError("Browser geolocation is not supported on this device.");
			return;
		}

		setIsSearching(true);
		setError(null);

		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const loc: GeoLocation = {
					id: 999999,
					name: "My Current Location",
					country: "Local Area",
					latitude: pos.coords.latitude,
					longitude: pos.coords.longitude,
					timezone: "auto",
				};
				onLocationSelect(loc);
				setResults([]);
				setIsSearching(false);
			},
			() => {
				setError("Location access denied or unavailable. Please type your city.");
				setIsSearching(false);
			},
			{ timeout: 8000 },
		);
	};

	return (
		<section className="section" aria-labelledby="location-heading">
			<div className="card">
				<h2 id="location-heading" className="section-title">
					<span aria-hidden="true">📍</span>
					<span>Location: {currentLocation.name}, {currentLocation.country}</span>
				</h2>

				<form onSubmit={(e) => void handleSearch(e)} className="form-control" role="search">
					<label htmlFor="city-search">Search City or Urban Area</label>
					<div style={{ display: "flex", gap: "0.5rem" }}>
						<input
							id="city-search"
							type="text"
							value={query}
							onChange={(e) => {
								setQuery(e.target.value);
							}}
							placeholder="e.g. New Delhi, London, Beijing, Chicago..."
							disabled={isLoading || isSearching}
							style={{ flex: 1 }}
						/>
						<button
							type="submit"
							className="btn btn-primary"
							disabled={isLoading || isSearching || query.trim().length < 2}
						>
							{isSearching ? "Searching..." : "Find"}
						</button>
						<button
							type="button"
							className="btn btn-secondary"
							onClick={handleGeolocation}
							disabled={isLoading || isSearching}
							title="Use my device GPS location"
						>
							<span aria-hidden="true">🎯</span>
							<span className="sr-only">Use GPS location</span>
						</button>
					</div>
				</form>

				<div aria-live="polite" aria-atomic="true">
					{error !== null && (
						<p role="alert" style={{ color: "var(--aqi-unhealthy)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
							{error}
						</p>
					)}

					{results.length > 0 && (
						<ul
							style={{
								marginTop: "0.75rem",
								display: "flex",
								flexDirection: "column",
								gap: "0.35rem",
							}}
						>
							{results.map((loc) => (
								<li key={loc.id}>
									<button
										type="button"
										className="btn btn-secondary"
										style={{ width: "100%", justifyContent: "flex-start", textAlign: "left" }}
										onClick={() => {
											onLocationSelect(loc);
											setResults([]);
											setQuery("");
										}}
									>
										<span>🏙️</span>
										<span>
											<strong>{loc.name}</strong>
											{loc.admin1 !== undefined ? `, ${loc.admin1}` : ""}, {loc.country}
										</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</section>
	);
}
