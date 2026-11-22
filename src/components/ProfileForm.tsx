"use client";

import React, { useState } from "react";
import { Icon } from "@/components/Icon";
import type {
	CommuteMode,
	CookingFuel,
	HeatingType,
	HomeType,
	HouseholdProfile,
} from "@/lib/types";

interface ProfileFormProps {
	readonly initialProfile: HouseholdProfile;
	readonly onProfileChange: (profile: HouseholdProfile) => void;
	readonly isLoading: boolean;
}

/** Edit optional household, commute, fuel, and protection inputs. */
export function ProfileForm({
	initialProfile,
	onProfileChange,
	isLoading,
}: ProfileFormProps): React.JSX.Element {
	const [profile, setProfile] = useState<HouseholdProfile>(initialProfile);
	const [isOpen, setIsOpen] = useState(false);

	const handleSubmit = (e: React.SyntheticEvent): void => {
		e.preventDefault();
		onProfileChange(profile);
	};

	return (
		<div className="context-household">
			<div className="context-household-copy">
				<span className="context-label">Household</span>
				<strong>Personalise the plan</strong>
				<span className="context-summary">{initialProfile.childrenUnder12} child · {initialProfile.adultsOver65} older adult · {initialProfile.respiratoryCondition ? "Asthma" : "No respiratory condition"} · {initialProfile.commuteDistanceKm} km commute</span>
			</div>
			<div className="context-household-actions">
				<button
					type="button"
					className="btn btn-secondary"
					data-testid="edit-household-button"
					onClick={() => {
						setIsOpen(!isOpen);
					}}
					aria-expanded={isOpen}
					aria-controls="profile-form-content"
				>
					{isOpen ? "Close editor" : "Edit household"}
				</button>
			</div>

			{isOpen && <div className="profile-editor">
				<div className="section-heading-row">
					<h2 id="profile-heading" className="section-title">
						<Icon name="family" />
						<span>Household details</span>
					</h2>
				</div>

				<p className="section-intro">
					These details shape the risk warnings, indoor actions, and routine timing.
				</p>

					<form
						id="profile-form-content"
						onSubmit={handleSubmit}
						className="profile-form"
					>
						<div className="form-grid">
							{/* Family Demographics */}
							<fieldset>
								<legend>Family Demographics</legend>

								<div className="form-control">
									<label htmlFor="childrenUnder12">Children under 12</label>
									<input
										id="childrenUnder12"
										name="childrenUnder12"
										autoComplete="off"
										data-testid="childrenUnder12"
										type="number"
										min={0}
										max={10}
										value={profile.childrenUnder12}
										onChange={(e) => {
											setProfile({
												...profile,
												childrenUnder12: Math.max(0, Number.parseInt(e.target.value) || 0),
											});
										}}
									/>
								</div>

								<div className="form-control">
									<label htmlFor="adultsOver65">Adults over 65</label>
									<input
										id="adultsOver65"
										name="adultsOver65"
										autoComplete="off"
										data-testid="adultsOver65"
										type="number"
										min={0}
										max={10}
										value={profile.adultsOver65}
										onChange={(e) => {
											setProfile({
												...profile,
												adultsOver65: Math.max(0, Number.parseInt(e.target.value) || 0),
											});
										}}
									/>
								</div>

								<div className="form-control">
									<label className="checkbox-control">
										<input
											name="pregnant"
											data-testid="pregnant"
											type="checkbox"
											checked={profile.pregnant}
											onChange={(e) => {
												setProfile({ ...profile, pregnant: e.target.checked });
											}}
										/>
										<span>Pregnant family member</span>
									</label>
								</div>

								<div className="form-control">
									<label className="checkbox-control">
										<input
											name="respiratoryCondition"
											data-testid="respiratoryCondition"
											type="checkbox"
											checked={profile.respiratoryCondition}
											onChange={(e) => {
												setProfile({
													...profile,
													respiratoryCondition: e.target.checked,
												});
											}}
										/>
										<span>Asthma / COPD / Heart condition</span>
									</label>
								</div>

								<div className="form-control">
									<label className="checkbox-control">
										<input
											name="outdoorWorker"
											data-testid="outdoorWorker"
											type="checkbox"
											checked={profile.outdoorWorker}
											onChange={(e) => {
												setProfile({
													...profile,
													outdoorWorker: e.target.checked,
												});
											}}
										/>
										<span>Outdoor worker in household</span>
									</label>
								</div>
							</fieldset>

							{/* Commute */}
							<fieldset>
								<legend>Daily Commute</legend>

								<div className="form-control">
									<label htmlFor="commuteMode">Primary Transit Mode</label>
									<select
										id="commuteMode"
										name="commuteMode"
										data-testid="commuteMode"
										value={profile.commuteMode}
										onChange={(e) => {
											setProfile({
												...profile,
												commuteMode: e.target.value as CommuteMode,
											});
										}}
									>
										<option value="car_solo">Solo Private Car</option>
										<option value="carpool">Shared Carpool</option>
										<option value="motorbike">Motorbike / Scooter</option>
										<option value="bus">Public Bus</option>
										<option value="metro">Electric Metro / Rail</option>
										<option value="bicycle">Bicycle</option>
										<option value="walk">Walking</option>
									</select>
								</div>

								<div className="form-control">
									<label htmlFor="commuteDistanceKm">Daily Commute Distance (km roundtrip)</label>
									<input
										id="commuteDistanceKm"
										name="commuteDistanceKm"
										autoComplete="off"
										data-testid="commuteDistanceKm"
										type="number"
										min={1}
										max={150}
										value={profile.commuteDistanceKm}
										onChange={(e) => {
											setProfile({
												...profile,
												commuteDistanceKm: Math.max(1, Number.parseFloat(e.target.value) || 1),
											});
										}}
									/>
								</div>

								<div className="form-control">
									<label htmlFor="homeType">Home Structure Type</label>
									<select
										id="homeType"
										name="homeType"
										data-testid="homeType"
										value={profile.homeType}
										onChange={(e) => {
											setProfile({
												...profile,
												homeType: e.target.value as HomeType,
											});
										}}
									>
										<option value="apartment">Apartment / Flat</option>
										<option value="detached">Detached / Single Family House</option>
										<option value="informal">Informal Settlement / High-Draft Home</option>
									</select>
								</div>
							</fieldset>

							{/* Cooking & Heating Equipment */}
							<fieldset>
								<legend>Home Equipment & Fuels</legend>

								<div className="form-control">
									<label htmlFor="cookingFuel">Cooking Fuel Source</label>
									<select
										id="cookingFuel"
										name="cookingFuel"
										data-testid="cookingFuel"
										value={profile.cookingFuel}
										onChange={(e) => {
											setProfile({
												...profile,
												cookingFuel: e.target.value as CookingFuel,
											});
										}}
									>
										<option value="lpg">LPG / Piped Gas</option>
										<option value="biomass">Solid Biomass / Wood / Dung</option>
										<option value="induction">Electric Induction Cooktop</option>
										<option value="electric">Standard Electric Range</option>
									</select>
								</div>

								<div className="form-control">
									<label htmlFor="heating">Winter Space Heating</label>
									<select
										id="heating"
										name="heating"
										data-testid="heating"
										value={profile.heating}
										onChange={(e) => {
											setProfile({
												...profile,
												heating: e.target.value as HeatingType,
											});
										}}
									>
										<option value="none">None / Mild Climate</option>
										<option value="wood">Firewood / Open Hearth</option>
										<option value="coal">Coal Brazier (Angithi)</option>
										<option value="electric">Electric Heater / Heat Pump</option>
										<option value="gas">Natural Gas Heater</option>
									</select>
								</div>

								<div className="form-control">
									<label className="checkbox-control">
										<input
											name="hasAirPurifier"
											data-testid="hasAirPurifier"
											type="checkbox"
											checked={profile.hasAirPurifier}
											onChange={(e) => {
												setProfile({
													...profile,
													hasAirPurifier: e.target.checked,
												});
											}}
										/>
										<span>Has HEPA Air Purifier</span>
									</label>
								</div>

								<div className="form-control">
									<label className="checkbox-control">
										<input
											name="hasN95Masks"
											data-testid="hasN95Masks"
											type="checkbox"
											checked={profile.hasN95Masks}
											onChange={(e) => {
												setProfile({
													...profile,
													hasN95Masks: e.target.checked,
												});
											}}
										/>
										<span>Has N95 / FFP2 Masks</span>
									</label>
								</div>

								<div className="form-control">
									<label className="checkbox-control">
										<input
											name="smokerInHouse"
											data-testid="smokerInHouse"
											type="checkbox"
											checked={profile.smokerInHouse}
											onChange={(e) => {
												setProfile({
													...profile,
													smokerInHouse: e.target.checked,
												});
											}}
										/>
										<span>Tobacco smoker in household</span>
									</label>
								</div>
							</fieldset>
						</div>

					<div className="form-actions">
							<button type="submit" className="btn btn-primary" data-testid="profile-apply-button" disabled={isLoading}>
								{isLoading ? "Recalculating…" : "Apply & update routine"}
							</button>
						</div>
					</form>
			</div>}
		</div>
	);
}
