import { generateMedicalReasoning } from "./aiService.js";
import { detectBodyPartPriority } from "./bodyPartMapping.js";
import { detectCriticalCondition } from "./criticalCheck.js";
import { handleEdgeCases } from "./edgeCaseHandling.js";
import { detectEmotionalState } from "./emotionAnalysis.service.js";
import { detectDuration, normalizeUserInput } from "./inputNormalization.service.js";
import { mapMedicalInput, rankMedicalMatches } from "./ruleEngine.js";
import { extractSymptoms } from "./symptomExtraction.service.js";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildTopConditions = (primary, rankedMatches = []) => {
  const base = [
    {
      name: primary.condition,
      probability: 0
    },
    ...rankedMatches
      .filter((item) => item.condition !== primary.condition)
      .slice(0, 4)
      .map((item) => ({
        name: item.condition,
        probability: 0
      }))
  ].slice(0, 3);

  const distributionByRisk = {
    High: [58, 27, 15],
    Medium: [52, 30, 18],
    Low: [64, 23, 13]
  };

  const weights = distributionByRisk[primary.risk_level] || distributionByRisk.Medium;

  return base.map((item, index) => ({
    ...item,
    probability: weights[index] || 0
  }));
};

const computeUrgencyScore = ({
  riskLevel,
  riskScore,
  duration,
  symptomCount,
  emotionalState,
  isCritical
}) => {
  if (isCritical) {
    return 10;
  }

  let score = riskLevel === "High" ? 8 : riskLevel === "Medium" ? 5 : 2;

  if (riskScore >= 85) score += 1;
  if (duration?.days >= 7) score += 1;
  if (duration?.days >= 30) score += 1;
  if (symptomCount >= 3) score += 1;
  if (["Anxiety", "Panic", "Depression"].includes(emotionalState)) score += 1;

  return clamp(score, 1, 10);
};

const buildProgression = (analysis) => {
  const templates = {
    critical: {
      early: "Symptoms may begin suddenly but can worsen quickly within hours.",
      mid: "Function can decline rapidly with higher risk of complications.",
      severe: "Delay may lead to organ damage, collapse, or life-threatening progression."
    },
    body_part: {
      early: `The affected ${analysis.body_part || "area"} may stay painful or irritated.`,
      mid: "Inflammation, reduced function, or spread of symptoms can increase.",
      severe: "Persistent neglect may lead to more serious damage or difficult recovery."
    },
    infection: {
      early: "Infectious symptoms may remain mild with fatigue or low-grade fever.",
      mid: "Untreated infection can intensify with fever, weakness, or spreading symptoms.",
      severe: "Severe infection may lead to dehydration, breathing issues, or wider complications."
    },
    general: {
      early: "Symptoms may remain intermittent but unresolved.",
      mid: "Ongoing symptoms can become more frequent or disruptive.",
      severe: "Ignoring persistent symptoms may delay diagnosis and worsen recovery."
    }
  };

  const selected =
    templates[analysis.category] ||
    (analysis.risk_level === "High" ? templates.critical : templates.general);

  return {
    early_stage: selected.early,
    mid_stage: selected.mid,
    severe_stage: selected.severe
  };
};

export const analyzeHealthMessage = async (message, options = {}) => {
  const normalizedMessage = normalizeUserInput(message);
  const symptoms = await extractSymptoms(normalizedMessage);
  const emotionalState = detectEmotionalState(normalizedMessage);
  const duration = detectDuration(normalizedMessage);
  const criticalMatch = detectCriticalCondition(normalizedMessage, symptoms);
  const edgeCaseMatch = criticalMatch ? null : handleEdgeCases(normalizedMessage, symptoms);
  const bodyPartMatch =
    criticalMatch || edgeCaseMatch ? null : detectBodyPartPriority(normalizedMessage, symptoms);
  const generalMatch =
    criticalMatch || edgeCaseMatch || bodyPartMatch ? null : mapMedicalInput(symptoms, normalizedMessage);
  const medicalMatch = criticalMatch || edgeCaseMatch || bodyPartMatch || generalMatch;
  const rankedMatches =
    criticalMatch || edgeCaseMatch ? [] : rankMedicalMatches(symptoms, normalizedMessage);
  const ruleAnalysis = {
    ...medicalMatch,
    symptoms,
    memory_context: options.memoryContext || "",
    history_context: options.historyContext || ""
  };

  if (medicalMatch?.category === "edge_case") {
    return {
      symptoms: medicalMatch.symptoms || symptoms,
      condition: medicalMatch.condition,
      risk_level: medicalMatch.risk_level,
      risk_score: medicalMatch.risk_score,
      recommended_doctor: medicalMatch.recommended_doctor,
      explanation: medicalMatch.explanation,
      next_steps: medicalMatch.next_steps,
      prevention: medicalMatch.prevention,
      normalized_symptoms: symptoms.length ? symptoms.join(", ") : normalizedMessage,
      emotional_state: emotionalState,
      possible_conditions: buildTopConditions(medicalMatch),
      urgency_score: computeUrgencyScore({
        riskLevel: medicalMatch.risk_level,
        riskScore: medicalMatch.risk_score,
        duration,
        symptomCount: symptoms.length,
        emotionalState,
        isCritical: false
      }),
      progression_if_ignored: buildProgression(medicalMatch),
      advice: medicalMatch.next_steps,
      prevention: medicalMatch.prevention,
      disclaimer: "This is not a medical diagnosis. Please consult a qualified doctor.",
      duration: duration?.raw || null,
      memory_reference: options.memoryReference || null
    };
  }

  const reasoning = await generateMedicalReasoning({
    message: normalizedMessage,
    analysis: ruleAnalysis
  });

  const adjustedRiskScore = clamp(
    ruleAnalysis.risk_score + (duration?.days >= 7 ? 5 : 0) + (symptoms.length >= 3 ? 4 : 0),
    ruleAnalysis.risk_level === "High" ? 71 : ruleAnalysis.risk_level === "Medium" ? 41 : 0,
    ruleAnalysis.risk_level === "High" ? 100 : ruleAnalysis.risk_level === "Medium" ? 70 : 40
  );

  const urgencyScore = computeUrgencyScore({
    riskLevel: ruleAnalysis.risk_level,
    riskScore: adjustedRiskScore,
    duration,
    symptomCount: symptoms.length,
    emotionalState,
    isCritical: ruleAnalysis.category === "critical"
  });

  return {
    symptoms,
    normalized_symptoms: symptoms.length ? symptoms.join(", ") : normalizedMessage,
    emotional_state: emotionalState,
    possible_conditions: buildTopConditions(
      {
        ...ruleAnalysis,
        risk_score: adjustedRiskScore
      },
      rankedMatches
    ),
    condition: ruleAnalysis.condition,
    risk_level: ruleAnalysis.risk_level,
    risk_score: adjustedRiskScore,
    urgency_score: urgencyScore,
    recommended_doctor: ruleAnalysis.recommended_doctor,
    explanation: reasoning.explanation,
    next_steps: Array.isArray(reasoning.next_steps) ? reasoning.next_steps.slice(0, 3) : [],
    advice: Array.isArray(reasoning.next_steps) ? reasoning.next_steps.slice(0, 3) : [],
    prevention: Array.isArray(reasoning.prevention) ? reasoning.prevention.slice(0, 2) : [],
    progression_if_ignored: buildProgression(ruleAnalysis),
    duration: duration?.raw || null,
    emergency:
      ruleAnalysis.category === "critical" || urgencyScore >= 8
        ? "Immediate medical attention required"
        : null,
    disclaimer: "This is not a medical diagnosis. Please consult a qualified doctor.",
    memory_reference: options.memoryReference || null
  };
};
