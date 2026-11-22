"use client";

import React, { useState } from "react";
import { Icon } from "@/components/Icon";
import { searchLocationsClient } from "@/lib/client";
import type { GeoLocation } from "@/lib/types";

interface LocationPickerProps {
	readonly currentLocation: GeoLocation;
	readonly onLocationSelect: (location: GeoLocation) => void;
	readonly isLoading: boolean;
}

/** Provide city search and browser-geolocation controls. */
export function LocationPicker({ currentLocation, onLocationSelect, isLoading }: LocationPickerProps): React.JSX.Element {
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
			if (found.length === 0) setError("No matching cities found. Please try another name.");
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
				onLocationSelect({ id: 999999, name: "My Current Location", country: "Local Area", latitude: pos.coords.latitude, longitude: pos.coords.longitude, timezone: "auto" });
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
				<h2 id="location-heading" className="section-title"><Icon name="pin" /><span>Location: {currentLocation.name}, {currentLocation.country}</span></h2>
				<p className="section-intro">Start with the place your family will move through today.</p>

				<form onSubmit={(e) => void handleSearch(e)} className="location-form" role="search">
					<label htmlFor="city-search">Search city or urban area</label>
					<div className="location-controls">
						<input id="city-search" data-testid="city-search-input" type="text" value={query} onChange={(e) => { setQuery(e.target.value); }} placeholder="New Delhi, London, Beijing..." disabled={isLoading || isSearching} />
						<button type="submit" className="btn btn-primary" data-testid="find-city-button" disabled={isLoading || isSearching || query.trim().length < 2}><Icon name="search" size={16} /><span>{isSearching ? "Searching" : "Find"}</span></button>
						<button type="button" className="btn btn-secondary icon-button" onClick={handleGeolocation} disabled={isLoading || isSearching} title="Use my device GPS location"><Icon name="target" size={17} /><span className="sr-only">Use GPS location</span></button>
					</div>
				</form>

				<div aria-live="polite" aria-atomic="true">
					{error !== null && <p role="alert" className="form-message form-message-error">{error}</p>}
					{results.length > 0 && (
						<ul className="location-results">
							{results.map((loc) => (
								<li key={loc.id}><button type="button" className="location-result" onClick={() => { onLocationSelect(loc); setResults([]); setQuery(""); }}><Icon name="pin" size={16} /><span><strong>{loc.name}</strong>{loc.admin1 !== undefined ? `, ${loc.admin1}` : ""}, {loc.country}</span></button></li>
							))}
						</ul>
					)}
				</div>
			</div>
		</section>
	);
}
