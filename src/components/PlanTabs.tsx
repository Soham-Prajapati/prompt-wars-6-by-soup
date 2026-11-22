"use client";

import React, { useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { firstSentence } from "@/lib/summary";
import type { AirHack, CleanAirPlan, RoutineSegment, SustainableAlternative } from "@/lib/types";

interface PlanTabsProps {
	readonly plan: CleanAirPlan;
}

const TABS = [
	{ id: "routine", label: "Today’s routine", icon: "calendar" as const },
	{ id: "home", label: "At home", icon: "tools" as const },
	{ id: "swaps", label: "Swaps", icon: "leaf" as const },
] as const;

function impactForRoutine(item: RoutineSegment): string {
	return item.outdoorActivityAllowed ? "Window open" : "Stay inside";
}

function impactForHack(item: AirHack): string {
	return `−${String(item.pm25ReductionPct)}% PM2.5`;
}

function impactForAlternative(item: SustainableAlternative): string {
	if (item.co2AvoidedKgWeekly > 0) return `−${String(item.co2AvoidedKgWeekly)} kg CO₂/wk`;
	if (item.indoorPm25ReductionPct > 0) return `−${String(item.indoorPm25ReductionPct)}% indoor PM2.5`;
	return `−${String(item.pm25AvoidedGramsWeekly)} g PM2.5/wk`;
}

function RoutineItems({ routine }: { readonly routine: readonly RoutineSegment[] }): React.JSX.Element {
	return (
		<ol className="plan-list routine-list">
			{routine.map((item) => (
				<li className="plan-item" key={item.id}>
					<div className="plan-item-rail"><span>{item.timeSpan}</span><i aria-hidden="true" /></div>
					<div className="plan-item-body">
						<div className="plan-item-heading"><h3>{item.label}</h3><span className={`impact-pill ${item.outdoorActivityAllowed ? "is-open" : "is-closed"}`}>{impactForRoutine(item)}</span></div>
						<p className="plan-item-why">{firstSentence(item.actionDescription)}</p>
						<details className="how-disclosure"><summary>How <span aria-hidden="true">↗</span></summary><div><p>{item.actionDescription}</p><p><strong>Ventilation:</strong> {item.ventilationAdvice}</p><p><strong>For:</strong> {item.targetedMembers.join(", ")}</p></div></details>
					</div>
				</li>
			))}
		</ol>
	);
}

function HomeItems({ hacks }: { readonly hacks: readonly AirHack[] }): React.JSX.Element {
	return (
		<ol className="plan-list">
			{hacks.map((item) => (
				<li className="plan-item" key={item.id}>
					<div className="plan-item-index">{String(item.rank).padStart(2, "0")}</div>
					<div className="plan-item-body"><div className="plan-item-heading"><h3>{item.title}</h3><span className="impact-pill">{impactForHack(item)}</span></div><p className="plan-item-why">{firstSentence(item.summary)}</p><details className="how-disclosure"><summary>How <span aria-hidden="true">↗</span></summary><div><ul>{item.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ul><p><strong>Why this fits:</strong> {item.relevanceReason}</p></div></details></div>
				</li>
			))}
		</ol>
	);
}

function SwapItems({ alternatives }: { readonly alternatives: readonly SustainableAlternative[] }): React.JSX.Element {
	if (alternatives.length === 0) return <p className="empty-state">Your current choices are already the cleaner option in this plan.</p>;

	return (
		<ol className="plan-list">
			{alternatives.map((item) => (
				<li className="plan-item" key={item.id}>
					<div className="plan-item-index">↗</div>
					<div className="plan-item-body"><div className="plan-item-heading"><h3>{item.title}</h3><span className="impact-pill">{impactForAlternative(item)}</span></div><p className="plan-item-why">{firstSentence(item.rationale)}</p><details className="how-disclosure"><summary>How <span aria-hidden="true">↗</span></summary><div><p><strong>Now:</strong> {item.currentOption}</p><p><strong>Try:</strong> {item.proposedOption}</p><p><strong>Evidence:</strong> {item.scientificBasis}</p></div></details></div>
				</li>
			))}
		</ol>
	);
}

/** Accessible segmented plan body with compact summaries and on-demand detail. */
export function PlanTabs({ plan }: PlanTabsProps): React.JSX.Element {
	const [activeTab, setActiveTab] = useState("routine");
	const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
	const tablistId = "plan-tablist";

	const selectTab = (nextId: string): void => {
		setActiveTab(nextId);
	};

	const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
		const currentIndex = TABS.findIndex((tab) => tab.id === activeTab);
		let nextIndex = currentIndex;
		if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % TABS.length;
		if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
		if (event.key === "Home") nextIndex = 0;
		if (event.key === "End") nextIndex = TABS.length - 1;
		if (nextIndex !== currentIndex) {
			event.preventDefault();
			const nextTab = TABS[nextIndex];
			if (nextTab) {
				selectTab(nextTab.id);
				tabRefs.current[nextIndex]?.focus();
			}
		}
	};

	return (
		<section className="plan-section" aria-labelledby="plan-heading">
			<div className="plan-section-heading"><div><div className="section-kicker">The plan</div><h2 id="plan-heading">A lighter way through today</h2><p>Short on purpose. Open “How” when you need the reasoning or the steps.</p></div><span className="plan-updated">Live plan · 24 hours</span></div>
			<div className="tab-shell">
				<div className="tablist" id={tablistId} role="tablist" aria-label="Daily air plan">
					{TABS.map((tab, index) => <button type="button" role="tab" className={`tab-button ${activeTab === tab.id ? "is-active" : ""}`} id={`${tab.id}-tab`} aria-selected={activeTab === tab.id} aria-controls={`${tab.id}-panel`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => { selectTab(tab.id); }} onKeyDown={handleTabKeyDown} ref={(element) => { tabRefs.current[index] = element; }} key={tab.id}><Icon name={tab.icon} size={16} /><span>{tab.label}</span></button>)}
				</div>
				<div className="tab-panel" role="tabpanel" id={`${activeTab}-panel`} aria-labelledby={`${activeTab}-tab`} tabIndex={0}>
					{activeTab === "routine" && <RoutineItems routine={plan.dailyRoutine} />}
					{activeTab === "home" && <HomeItems hacks={plan.rankedHacks} />}
					{activeTab === "swaps" && <SwapItems alternatives={plan.alternatives} />}
				</div>
			</div>
		</section>
	);
}
