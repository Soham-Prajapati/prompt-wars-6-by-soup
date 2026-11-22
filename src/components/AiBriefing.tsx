"use client";

import React, { useState } from "react";
import { fetchBriefing, sendChatMessage, type ChatMessage } from "@/lib/client";
import { LANGUAGE_LABELS } from "@/lib/prompt";
import type { CleanAirPlan, HouseholdProfile, SupportedLanguage } from "@/lib/types";

interface AiBriefingProps {
	readonly plan: CleanAirPlan;
	readonly profile: HouseholdProfile;
}

/** Provide explicit-action multilingual briefing generation and grounded chat. */
export function AiBriefing({ plan, profile }: AiBriefingProps): React.JSX.Element {
	const [language, setLanguage] = useState<SupportedLanguage>("en");
	const [briefingText, setBriefingText] = useState<string | null>(null);
	const [briefingSource, setBriefingSource] = useState<"ai" | "fallback" | null>(null);
	const [isBriefingLoading, setIsBriefingLoading] = useState(false);
	const [briefingError, setBriefingError] = useState<string | null>(null);

	// Chat state
	const [messages, setMessages] = useState<readonly ChatMessage[]>([]);
	const [inputQuestion, setInputQuestion] = useState("");
	const [isChatLoading, setIsChatLoading] = useState(false);
	const [chatError, setChatError] = useState<string | null>(null);

	const handleGenerateBriefing = async (targetLang = language): Promise<void> => {
		setIsBriefingLoading(true);
		setBriefingError(null);
		try {
			const res = await fetchBriefing(plan, profile, targetLang);
			setBriefingText(res.briefing);
			setBriefingSource(res.source);
		} catch {
			setBriefingError("Failed to generate briefing. Please try again.");
		} finally {
			setIsBriefingLoading(false);
		}
	};

	const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
		const newLang = e.target.value as SupportedLanguage;
		setLanguage(newLang);
		if (briefingText !== null) {
			void handleGenerateBriefing(newLang);
		}
	};

	const handleSendQuestion = async (e: React.SyntheticEvent): Promise<void> => {
		e.preventDefault();
		const q = inputQuestion.trim();
		if (q.length === 0 || isChatLoading) return;

		const userMsg: ChatMessage = { role: "user", content: q };
		const nextHistory = [...messages, userMsg];
		setMessages(nextHistory);
		setInputQuestion("");
		setIsChatLoading(true);
		setChatError(null);

		try {
			const res = await sendChatMessage(q, plan, profile, language, nextHistory);
			const assistantMsg: ChatMessage = { role: "assistant", content: res.answer };
			setMessages([...nextHistory, assistantMsg]);
		} catch {
			setChatError("Unable to get an answer right now. Please try again.");
		} finally {
			setIsChatLoading(false);
		}
	};

	return (
		<section className="section" aria-labelledby="ai-briefing-heading">
			<div className="card">
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
					<h2 id="ai-briefing-heading" className="section-title" style={{ margin: 0 }}>
						<span aria-hidden="true">🤖</span>
						<span>Family Air Quality Briefing & Copilot</span>
					</h2>

					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<label htmlFor="language-select" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
							Language:
						</label>
						<select
							id="language-select"
							value={language}
							onChange={handleLanguageChange}
							style={{
								background: "var(--surface-raised)",
								border: "1px solid var(--border-strong)",
								borderRadius: "var(--radius-sm)",
								padding: "0.35rem 0.6rem",
								fontSize: "0.85rem",
							}}
						>
							{(Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).map((code) => (
								<option key={code} value={code}>
									{LANGUAGE_LABELS[code]}
								</option>
							))}
						</select>

						<button
							type="button"
							className="btn btn-primary"
							style={{ fontSize: "0.85rem", padding: "0.35rem 0.85rem" }}
							onClick={() => void handleGenerateBriefing()}
							disabled={isBriefingLoading}
						>
							{isBriefingLoading
								? "Generating..."
								: briefingText === null
									? "Generate Daily Briefing"
									: "Refresh Briefing"}
						</button>
					</div>
				</div>

				<div aria-live="polite" aria-busy={isBriefingLoading}>
					{briefingError !== null && (
						<p style={{ color: "var(--aqi-unhealthy)", fontSize: "0.85rem", marginBottom: "1rem" }}>
							{briefingError}
						</p>
					)}

					{briefingText !== null && (
						<div
							style={{
								background: "var(--surface-raised)",
								border: "1px solid var(--border)",
								borderRadius: "var(--radius-sm)",
								padding: "1.25rem",
								marginBottom: "1.5rem",
								whiteSpace: "pre-line",
								lineHeight: 1.6,
							}}
						>
							<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
								<span className="badge" style={{ fontSize: "0.75rem" }}>
									{briefingSource === "ai"
										? "✨ Gemini AI Generated"
										: "📋 Deterministic Science Guide"}
								</span>
							</div>
							<div>{briefingText}</div>
						</div>
					)}
				</div>

				{/* Interactive Follow-up Chat */}
				<div className="chat-box">
					<h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>
						Ask Follow-up Questions (Grounded strictly in your air data)
					</h3>

					<div className="chat-messages" role="log" aria-live="polite">
						{messages.length === 0 ? (
							<p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
								Ask anything about your routine: &ldquo;When should my children avoid outdoors?&rdquo;, &ldquo;Which mask should I buy?&rdquo;, &ldquo;How much does wet mopping help?&rdquo;
							</p>
						) : (
							messages.map((m, idx) => (
								<div
									key={idx}
									className={`chat-bubble ${m.role}`}
								>
									<strong>{m.role === "user" ? "You" : "ClearAir"}:</strong> {m.content}
								</div>
							))
						)}
						{isChatLoading && (
							<div className="chat-bubble assistant" style={{ fontStyle: "italic" }}>
								ClearAir is reviewing the computed facts...
							</div>
						)}
					</div>

					<form onSubmit={(e) => void handleSendQuestion(e)} className="chat-input-row">
						<input
							type="text"
							value={inputQuestion}
							onChange={(e) => {
								setInputQuestion(e.target.value);
							}}
							placeholder="Type your question about air quality or routine..."
							disabled={isChatLoading}
							aria-label="Ask a question about the plan"
						/>
						<button
							type="submit"
							className="btn btn-primary"
							disabled={isChatLoading || inputQuestion.trim().length === 0}
						>
							Send
						</button>
					</form>

					{chatError !== null && (
						<p role="alert" style={{ color: "var(--aqi-unhealthy)", fontSize: "0.8rem", marginTop: "0.5rem" }}>
							{chatError}
						</p>
					)}
				</div>
			</div>
		</section>
	);
}
