import { askGemini } from "../services/gemini.service.js";
import { getAIMemory, updateAIMemory } from "../services/memory.service.js";
import { medicalSafety } from "../services/medicalSafety.service.js";
import { explainableAI } from "../services/explainableAI.service.js";
import ChatHistory from "../models/ChatHistory.model.js";
import User from "../models/User.model.js";
import HealthRecord from "../models/HealthRecord.model.js";
import { healthPrompt } from "../utils/promptTemplates.js";

const extractHealthData = (message, response) => {
  const symptoms = [];
  const diagnoses = [];
  const medications = [];

  const symptomPatterns = [
    /symptoms?[:\s]+([^.]+)/gi,
    /(?:experiencing|having|suffering|sense of)\s+([^.]+)/gi,
    /(?:pain|ache|discomfort|numbness|swelling|rash|fever|cough|headache|dizziness|nausea|fatigue)/gi
  ];

  const diagnosisPatterns = [
    /diagnosis[:\s]+([^.]+)/gi,
    /(?:may be|possible|probable|suggestive|indicative)[:\s]+([^.]+)/gi,
    /(?:condition|disorder|infection|disease)[:\s]+([^.]+)/gi
  ];

  const medicationPatterns = [
    /(?:medication|medicine|drug|tablet|capsule|syrup)[:\s]+([^.]+)/gi,
    /(?:take|prescribe|recommend)[:\s]+(\w+\s*(?:mg|ml)?)/gi
  ];

  const combinedText = `${message} ${response}`;

  let match;
  symptomPatterns.forEach((pattern) => {
    while ((match = pattern.exec(combinedText)) !== null) {
      const symptom = match[1] || match[0];
      if (symptom && symptom.length > 2 && symptom.length < 100) {
        symptoms.push(symptom.trim());
      }
    }
  });

  diagnosisPatterns.forEach((pattern) => {
    while ((match = pattern.exec(combinedText)) !== null) {
      const diagnosis = match[1] || match[0];
      if (diagnosis && diagnosis.length > 2 && diagnosis.length < 100) {
        diagnoses.push(diagnosis.trim());
      }
    }
  });

  medicationPatterns.forEach((pattern) => {
    while ((match = pattern.exec(combinedText)) !== null) {
      const med = match[1] || match[0];
      if (med && med.length > 2 && med.length < 100) {
        medications.push(med.trim());
      }
    }
  });

  return {
    symptoms: [...new Set(symptoms)].slice(0, 10),
    diagnoses: [...new Set(diagnoses)].slice(0, 5),
    medications: [...new Set(medications)].slice(0, 10)
  };
};

const detectRiskPatterns = (memory, currentData) => {
  const patterns = [];

  if (memory.frequentSymptoms) {
    const symptomCounts = {};
    [...(memory.frequentSymptoms || []), ...currentData.symptoms].forEach((s) => {
      symptomCounts[s.toLowerCase()] = (symptomCounts[s.toLowerCase()] || 0) + 1;
    });

    Object.entries(symptomCounts).forEach(([symptom, count]) => {
      if (count >= 3) {
        patterns.push(`Recurring: ${symptom}`);
      }
    });
  }

  if (currentData.symptoms.some((s) => /chest|heart|breathing|palpitation/i.test(s))) {
    patterns.push("Cardiovascular concern");
  }

  if (currentData.symptoms.some((s) => /fatigue|weakness|dizziness/i.test(s))) {
    patterns.push("Energy/nutritional concern");
  }

  if (currentData.symptoms.some((s) => /sleep|insomnia|nightmare/i.test(s))) {
    patterns.push("Sleep disorder");
  }

  if (currentData.diagnoses.some((d) => /diabetes|hypertension|asthma/i.test(d))) {
    patterns.push("Chronic condition monitoring needed");
  }

  return patterns;
};

const buildFallbackHealthResponse = (message, user) => {
  const extractedData = extractHealthData(message, "");
  const redFlags = medicalSafety.detectRedFlags(extractedData.symptoms);
  const lowerMessage = message.toLowerCase();
  const riskWords = /chest|breath|severe|faint|blood|confusion|weakness|vision|fever/i;
  const hasUrgentLanguage = riskWords.test(message);
  const hasFever = /fever|temperature|बुखार/i.test(lowerMessage);
  const hasHeadache = /headache|head pain|migraine|सर दर्द|सिर दर्द/i.test(lowerMessage);
  const hasCoughCold = /cough|cold|sore throat|runny nose|खांसी|जुकाम/i.test(lowerMessage);

  const nextSteps = [];
  if (hasFever) {
    nextSteps.push("Check and note your temperature every 4-6 hours.");
    nextSteps.push("Drink fluids and rest. Avoid self-medicating with antibiotics.");
  }
  if (hasHeadache) {
    nextSteps.push("Rest in a quiet room and avoid dehydration or skipped meals.");
  }
  if (hasCoughCold) {
    nextSteps.push("Use warm fluids/steam as tolerated and monitor breathing.");
  }
  if (!nextSteps.length) {
    nextSteps.push("Track symptom start time, severity, medicines taken, allergies, and what makes symptoms better or worse.");
  }
  nextSteps.push("Consult a qualified doctor if symptoms persist, worsen, or you are unsure.");

  const urgentAdvice =
    "Seek urgent care now if you have chest pain, breathing trouble, fainting, confusion, stiff neck, severe weakness, uncontrolled vomiting, rash with fever, or very high fever.";

  const plainResponse = [
    hasUrgentLanguage
      ? "Your symptoms include a possible red flag, so please take this seriously."
      : "Based on what you described, this sounds like a general symptom review.",
    hasFever || hasHeadache
      ? "For fever/headache, focus on hydration, rest, temperature monitoring, and watching for warning signs."
      : "Start with careful symptom tracking and basic supportive care.",
    urgentAdvice,
    `Next steps: ${nextSteps.join(" ")}`
  ].join(" ");

  return {
    aiResponse: plainResponse,
    extractedData,
    analysis: {
      symptoms: extractedData.symptoms,
      diagnosis: [],
      matchedConditions: [],
      hasRedFlags: redFlags.length > 0 || hasUrgentLanguage,
      vagueSymptoms: extractedData.symptoms.length < 2,
      condition: hasUrgentLanguage ? "Urgent symptom review advised" : "General symptom review",
      risk_level: hasUrgentLanguage ? "High" : "Medium",
      risk_score: hasUrgentLanguage ? 85 : 45,
      recommended_doctor: hasUrgentLanguage ? "Emergency care or General Physician" : "General Physician",
      explanation: "AI provider fallback response generated because the configured AI service was unavailable.",
      next_steps: nextSteps,
      prevention: []
    },
    redFlags,
    confidence: 0.3
  };
};

export const chatWithAI = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ message: "Message is required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const emergencyCheck = medicalSafety.detectEmergency(message);
    
    if (emergencyCheck?.isEmergency) {
      const healthData = extractHealthData(message, "");
      const redFlags = medicalSafety.detectRedFlags(healthData.symptoms);
      
      return res.status(200).json({
        isEmergency: true,
        emergency: {
          severity: emergencyCheck.severity,
          condition: emergencyCheck.condition,
          action: emergencyCheck.action,
          immediateAdvice: emergencyCheck.immediateAdvice,
          emergencyNumbers: emergencyCheck.callEmergency
        },
        redFlags,
        confidence: {
          score: 0.2,
          level: "Very Low",
          message: "Emergency detected - confidence reduced"
        },
        disclaimer: medicalSafety.generateDisclaimer(),
        seekProfessionalHelp: true
      });
    }

    const memory = await getAIMemory(req.user.id) || {};

    const prompt = healthPrompt(user, memory, message);

    let aiResponse;
    let fallback = null;

    try {
      aiResponse = await askGemini(prompt);
    } catch (aiError) {
      console.error("AI provider unavailable:", aiError.message);
      fallback = buildFallbackHealthResponse(message, user);
      aiResponse = fallback.aiResponse;
    }

    await ChatHistory.create({
      userId: req.user.id,
      userMessage: message,
      aiResponse
    });

    const extractedData = fallback?.extractedData || extractHealthData(message, aiResponse);

    const redFlags = medicalSafety.detectRedFlags(extractedData.symptoms);
    const hasRedFlags = redFlags.length > 0;

    const analysis = fallback?.analysis || {
      symptoms: extractedData.symptoms,
      diagnosis: extractedData.diagnoses,
      matchedConditions: [],
      hasRedFlags,
      vagueSymptoms: extractedData.symptoms.length < 2
    };

    const confidence = fallback?.confidence || medicalSafety.calculateConfidence(analysis);

    if (extractedData.symptoms.length > 0 || extractedData.diagnoses.length > 0) {
      const riskPatterns = detectRiskPatterns(memory, extractedData);

      await updateAIMemory(req.user.id, {
        frequentSymptoms: extractedData.symptoms,
        pastDiagnoses: extractedData.diagnoses,
        medicationsHistory: extractedData.medications,
        riskPatterns
      });
    }

    if (extractedData.diagnoses.length > 0) {
      await HealthRecord.create({
        userId: req.user.id,
        source: "chat",
        symptoms: extractedData.symptoms,
        diagnosis: extractedData.diagnoses.join(", "),
        medicines: extractedData.medications.map((m) => ({
          name: m,
          dosage: "As recommended",
          duration: "Consult doctor"
        }))
      });
    }

    const reasoning = fallback
      ? {
          confidenceFactors: ["AI provider unavailable"],
          reasoning: fallback.analysis.explanation
        }
      : explainableAI.analyzeReasoning(
      message,
      extractedData.symptoms,
      memory,
      user
    );

    const shouldSeekProfessional = medicalSafety.shouldSeekProfessional(
      extractedData.symptoms,
      confidence
    );

    res.status(200).json({
      input: message,
      response: aiResponse,
      extracted: {
        symptoms: extractedData.symptoms,
        diagnoses: extractedData.diagnoses,
        medications: extractedData.medications
      },
      redFlags,
      confidence: {
        score: confidence,
        level: medicalSafety.getConfidenceLabel(confidence),
        factors: reasoning.confidenceFactors
      },
      explanation: {
        reasoning,
        formatted: fallback
          ? fallback.analysis.explanation
          : explainableAI.formatReasoningResponse(reasoning)
      },
      recommendations: {
        seekProfessionalHelp: shouldSeekProfessional || hasRedFlags,
        reasons: shouldSeekProfessional 
          ? ["Low confidence in diagnosis", "Complex symptom pattern"]
          : []
      },
      disclaimer: medicalSafety.generateDisclaimer(),
      providerFallback: Boolean(fallback)
    });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: "AI chat failed" });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [chats, total] = await Promise.all([
      ChatHistory.find({ userId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ChatHistory.countDocuments({ userId: req.user.id }),
    ]);

    res.status(200).json({
      chats,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch chat history" });
  }
};
