/**
 * Deterministic Fallback Briefing & Response Generator.
 *
 * Ensures 100% of ClearAir's value is delivered even when GEMINI_API_KEY is not
 * configured or when third-party AI APIs experience outages. Generates complete,
 * empathetic, multilingual family briefings grounded strictly in the computed plan.
 */

import type {
	CleanAirPlan,
	HouseholdProfile,
	SupportedLanguage,
} from "@/lib/types";

/**
 * Generate a deterministic family briefing in English.
 */
function generateEnglishBriefing(plan: CleanAirPlan): string {
	const topHacks = plan.rankedHacks
		.slice(0, 3)
		.map((h) => `- **${h.title}** (${String(h.pm25ReductionPct)}% PM2.5 reduction, ${h.estimatedCost} cost): ${h.summary}`)
		.join("\n");

	const vulnerableNotes = plan.memberRisks
		.map((r) => `- **${r.memberType}**: ${r.riskTier.toUpperCase()} risk. ${r.protectiveAction}`)
		.join("\n");

	return `## Daily Air Quality Briefing for ${plan.location.name}

**Current Air Status:** The AQI is **${String(plan.currentAqi)}** (${plan.currentBand.label} ${plan.currentBand.icon}). ${plan.currentBand.description} Dominant pollutant is **${plan.dominantPollutant.name}** at ${String(plan.dominantPollutant.concentration)} ${plan.dominantPollutant.unit}.

### Priority Family Protection
${vulnerableNotes}

### Your Best Outdoor Window
The cleanest forecasted window today is between **${plan.bestWindow.startHour} and ${plan.bestWindow.endHour}** with an average AQI of **${String(plan.bestWindow.averageAqi)}**.
*Guidance:* ${plan.bestWindow.recommendation}

### Top 3 Immediate Indoor Hacks
${topHacks}

### Direct Impact of Your Choices
By following this low-emission daily routine, timing your ventilation, and using indoor filtration hacks, your family's personal inhaled PM2.5 particulate dose is estimated to drop from **${String(plan.exposureImpact.baselineInhaledPm25UgDay)} µg/day down to ${String(plan.exposureImpact.optimizedInhaledPm25UgDay)} µg/day** — a direct **${String(plan.exposureImpact.netReductionPct)}% reduction** in toxic inhalation exposure.`;
}

/**
 * Generate a deterministic family briefing in Hindi.
 */
function generateHindiBriefing(plan: CleanAirPlan): string {
	return `## ${plan.location.name} के लिए दैनिक वायु गुणवत्ता ब्रीफिंग

**वर्तमान वायु स्थिति:** AQI वर्तमान में **${String(plan.currentAqi)}** (${plan.currentBand.label} ${plan.currentBand.icon}) है। मुख्य प्रदूषक **${plan.dominantPollutant.name}** (${String(plan.dominantPollutant.concentration)} ${plan.dominantPollutant.unit}) है।

### परिवार के संवेदनशील सदस्यों के लिए सुरक्षा
${plan.memberRisks.map((r) => `- **${r.memberType}**: ${r.riskTier} जोखिम। ${r.protectiveAction}`).join("\n")}

### बाहर जाने का सबसे स्वच्छ समय
आज आवश्यक कार्यों और वेंटिलेशन के लिए सबसे सुरक्षित समय **${plan.bestWindow.startHour} से ${plan.bestWindow.endHour}** के बीच है (औसत AQI: ${String(plan.bestWindow.averageAqi)})।

### शीर्ष इनडोर वायु सुरक्षा उपाय
${plan.rankedHacks.slice(0, 3).map((h) => `- **${h.title}**: PM2.5 में ${String(h.pm25ReductionPct)}% की कमी। ${h.summary}`).join("\n")}

### आपके विकल्पों का प्रत्यक्ष प्रभाव
इस योजना का पालन करने से आपके परिवार के फेफड़ों में जाने वाले हानिकारक कणों में **${String(plan.exposureImpact.netReductionPct)}% की प्रत्यक्ष कमी** होगी (${String(plan.exposureImpact.baselineInhaledPm25UgDay)} µg से घटकर ${String(plan.exposureImpact.optimizedInhaledPm25UgDay)} µg प्रतिदिन)।`;
}

/**
 * Generate a deterministic family briefing in Spanish.
 */
function generateSpanishBriefing(plan: CleanAirPlan): string {
	return `## Informe Diario de Calidad del Aire para ${plan.location.name}

**Estado Actual:** El índice AQI es de **${String(plan.currentAqi)}** (${plan.currentBand.label} ${plan.currentBand.icon}). Contaminante principal: **${plan.dominantPollutant.name}** a ${String(plan.dominantPollutant.concentration)} ${plan.dominantPollutant.unit}.

### Protección para Miembros Vulnerables
${plan.memberRisks.map((r) => `- **${r.memberType}**: Riesgo ${r.riskTier}. ${r.protectiveAction}`).join("\n")}

### Mejor Ventana al Aire Libre
El período más limpio pronosticado es de **${plan.bestWindow.startHour} a ${plan.bestWindow.endHour}** (AQI promedio: ${String(plan.bestWindow.averageAqi)}).

### Consejos Clave para el Aire Interior
${plan.rankedHacks.slice(0, 3).map((h) => `- **${h.title}**: Reducción de PM2.5 del ${String(h.pm25ReductionPct)}%. ${h.summary}`).join("\n")}

### Impacto Directo de sus Decisiones
Seguir esta rutina reduce la inhalación de partículas tóxicas en un **${String(plan.exposureImpact.netReductionPct)}%** (${String(plan.exposureImpact.baselineInhaledPm25UgDay)} µg a ${String(plan.exposureImpact.optimizedInhaledPm25UgDay)} µg diarios).`;
}

/**
 * Generate a deterministic family briefing in Mandarin Chinese.
 */
function generateMandarinBriefing(plan: CleanAirPlan): string {
	return `## ${plan.location.name} 今日家庭空气质量简报

**当前空气状况：** 美国空气质量指数(AQI)为 **${String(plan.currentAqi)}**（${plan.currentBand.label} ${plan.currentBand.icon}）。主要污染物为 **${plan.dominantPollutant.name}**（${String(plan.dominantPollutant.concentration)} ${plan.dominantPollutant.unit}）。

### 重点家庭成员防护建议
${plan.memberRisks.map((r) => `- **${r.memberType}**：${r.riskTier} 风险。${r.protectiveAction}`).join("\n")}

### 今日最佳户外时间段
今天空气相对最佳的外出时间为 **${plan.bestWindow.startHour} 至 ${plan.bestWindow.endHour}**（平均AQI: ${String(plan.bestWindow.averageAqi)}）。建议在此期间进行必要外出或定时通风。

### 前三项核心室内空气净化技巧
${plan.rankedHacks.slice(0, 3).map((h) => `- **${h.title}**：可减少 ${String(h.pm25ReductionPct)}% 的PM2.5颗粒物。${h.summary}`).join("\n")}

### 行为改变的直接减排效果
通过执行本指南，您的家庭每日吸入的PM2.5暴露量将从 **${String(plan.exposureImpact.baselineInhaledPm25UgDay)} µg/天 降至 ${String(plan.exposureImpact.optimizedInhaledPm25UgDay)} µg/天**，直接实现 **${String(plan.exposureImpact.netReductionPct)}% 的暴露量削减**。`;
}

/**
 * Generate a deterministic family briefing in French.
 */
function generateFrenchBriefing(plan: CleanAirPlan): string {
	return `## Bulletin Quotidien de Qualité de l'Air pour ${plan.location.name}

**État Actuel de l'Air :** L'indice AQI est de **${String(plan.currentAqi)}** (${plan.currentBand.label} ${plan.currentBand.icon}). Polluant dominant : **${plan.dominantPollutant.name}** à ${String(plan.dominantPollutant.concentration)} ${plan.dominantPollutant.unit}.

### Protection Prioritaire des Membres Vulnérables
${plan.memberRisks.map((r) => `- **${r.memberType}** : Risque ${r.riskTier}. ${r.protectiveAction}`).join("\n")}

### Meilleure Fenêtre Extérieure
La fenêtre la plus propre aujourd'hui se situe entre **${plan.bestWindow.startHour} et ${plan.bestWindow.endHour}** (AQI moyen : ${String(plan.bestWindow.averageAqi)}).

### Top 3 des Astuces Intérieures Immédiates
${plan.rankedHacks.slice(0, 3).map((h) => `- **${h.title}** : Réduction de ${String(h.pm25ReductionPct)}% des PM2.5. ${h.summary}`).join("\n")}

### Impact Direct de Vos Choix
En suivant cette routine adaptée, vous réduisez la dose quotidienne de particules PM2.5 inhalées par votre famille de **${String(plan.exposureImpact.netReductionPct)}%** (${String(plan.exposureImpact.baselineInhaledPm25UgDay)} µg à ${String(plan.exposureImpact.optimizedInhaledPm25UgDay)} µg/jour).`;
}

/**
 * Generate a deterministic, fully formed briefing for any supported language.
 *
 * @param plan Decision engine output.
 * @param language Target language code.
 */
export function generateDeterministicBriefing(
	plan: CleanAirPlan,
	language: SupportedLanguage = "en",
): string {
	switch (language) {
		case "hi":
			return generateHindiBriefing(plan);
		case "es":
			return generateSpanishBriefing(plan);
		case "zh":
			return generateMandarinBriefing(plan);
		case "fr":
			return generateFrenchBriefing(plan);
		case "en":
		default:
			return generateEnglishBriefing(plan);
	}
}

/**
 * Generate a deterministic response to common questions when AI is unavailable.
 *
 * @param question Family user question.
 * @param plan Computed plan.
 * @param _profile Household profile.
 */
export function generateDeterministicChatResponse(
	question: string,
	plan: CleanAirPlan,
	_profile: HouseholdProfile,
): string {
	const q = question.toLowerCase();

	if (q.includes("mask") || q.includes("n95") || q.includes("ffp2")) {
		return `At an AQI of ${String(plan.currentAqi)} (${plan.currentBand.label}), wearing a well-fitted N95 or FFP2 respirator with headband straps reduces inhaled particulate exposure by up to 95%. Avoid cloth masks or loose bandanas as they do not filter fine PM2.5.`;
	}

	if (q.includes("purifier") || q.includes("hepa") || q.includes("filter") || q.includes("box fan")) {
		const topHack = plan.rankedHacks[0];
		return topHack
			? `Your top recommended air cleaning hack is "${topHack.title}": ${topHack.summary} It achieves an estimated ${String(topHack.pm25ReductionPct)}% PM2.5 reduction.`
			: `Running a certified HEPA air cleaner or DIY MERV-13 box fan removes over 75% of particulate matter from indoor living zones.`;
	}

	if (q.includes("child") || q.includes("kid") || q.includes("baby") || q.includes("asthma") || q.includes("elderly") || q.includes("senior")) {
		const vulnerable = plan.memberRisks[0];
		return vulnerable
			? `For ${vulnerable.memberType}: ${vulnerable.riskTier.toUpperCase()} risk. ${vulnerable.protectiveAction} Physiological factor: ${vulnerable.physiologicalReason}`
			: `Sensitive family members should avoid vigorous outdoor exertion during peak smog hours and remain in clean filtered indoor rooms.`;
	}

	if (q.includes("window") || q.includes("ventilate") || q.includes("outside") || q.includes("walk") || q.includes("run")) {
		return `Based on live forecast calculations, your cleanest outdoor window is between ${plan.bestWindow.startHour} and ${plan.bestWindow.endHour} (AQI ${String(plan.bestWindow.averageAqi)}). ${plan.bestWindow.recommendation}`;
	}

	return `Current air quality in ${plan.location.name} is AQI ${String(plan.currentAqi)} (${plan.currentBand.label}). Following your tailored daily routine reduces your family's inhaled PM2.5 exposure by ${String(plan.exposureImpact.netReductionPct)}%. Your safest outdoor window is ${plan.bestWindow.startHour} to ${plan.bestWindow.endHour}.`;
}
