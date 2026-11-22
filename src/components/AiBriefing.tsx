"use client";

import React, { useState } from "react";
import { Icon } from "@/components/Icon";
import { MarkdownRenderer } from "@/lib/markdown";
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
		if (briefingText !== null) void handleGenerateBriefing(newLang);
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
			setMessages([...nextHistory, { role: "assistant", content: res.answer }]);
		} catch {
			setChatError("Unable to get an answer right now. Please try again.");
		} finally {
			setIsChatLoading(false);
		}
	};

	return (
		<section className="section" aria-labelledby="ai-briefing-heading">
			<div className="card briefing-panel">
				<div className="section-heading-row briefing-heading">
					<div>
						<h2 id="ai-briefing-heading" className="section-title"><Icon name="spark" /><span>A note from ClearAir</span></h2>
						<p className="section-intro">A plain-language read of today&rsquo;s conditions, tailored to your household.</p>
					</div>
					<div className="briefing-actions">
						<label htmlFor="language-select">Language</label>
						<select id="language-select" name="language" data-testid="language-select" value={language} onChange={handleLanguageChange}>
							{(Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).map((code) => <option key={code} value={code}>{LANGUAGE_LABELS[code]}</option>)}
						</select>
						<button type="button" className="btn btn-primary" data-testid="generate-briefing-button" onClick={() => void handleGenerateBriefing()} disabled={isBriefingLoading}>
							<Icon name="spark" size={16} /><span>{isBriefingLoading ? "Generating" : briefingText === null ? "Generate briefing" : "Refresh briefing"}</span>
						</button>
					</div>
				</div>

				<div aria-live="polite" aria-busy={isBriefingLoading}>
					{briefingError !== null && <p className="form-message form-message-error">{briefingError}</p>}
					{briefingText !== null && (
						<div className="briefing-copy">
							<div className="briefing-meta"><span className="status-dot is-connected" aria-hidden="true" />{briefingSource === "ai" ? "AI narration" : "Science guide"}</div>
							<MarkdownRenderer content={briefingText} className="markdown-content" />
						</div>
					)}
				</div>

				<div className="chat-box">
					<div className="chat-heading"><h3>Ask a follow-up</h3><span>Grounded in your computed plan</span></div>
					<div className="chat-messages" role="log" aria-live="polite">
						{messages.length === 0 ? <p className="chat-empty">Try: “When should my children avoid outdoors?”</p> : messages.map((message, index) => (
							<div key={`${message.role}-${String(index)}`} className={`chat-bubble ${message.role}`}>
								<strong>{message.role === "user" ? "You" : "ClearAir"}</strong>
								{message.role === "assistant" ? <MarkdownRenderer content={message.content} className="markdown-content" /> : <p>{message.content}</p>}
							</div>
						))}
						{isChatLoading && <div className="chat-bubble assistant" aria-label="ClearAir is thinking"><em>Reviewing the computed facts…</em></div>}
					</div>
					<form onSubmit={(e) => void handleSendQuestion(e)} className="chat-input-row">
						<label className="sr-only" htmlFor="chat-input">Ask a question about the plan</label>
						<input id="chat-input" name="question" autoComplete="off" data-testid="chat-input" type="text" value={inputQuestion} onChange={(e) => { setInputQuestion(e.target.value); }} placeholder="e.g. When should we go out…" disabled={isChatLoading} />
						<button type="submit" className="btn btn-primary" data-testid="chat-send-button" disabled={isChatLoading || inputQuestion.trim().length === 0}><Icon name="send" size={16} /><span>Send</span></button>
					</form>
					{chatError !== null && <p role="alert" className="form-message form-message-error">{chatError}</p>}
				</div>
			</div>
		</section>
	);
}
