import { analyzeHealthMessage } from "../services/hybridAnalysis.service.js";

export const analyzeSymptoms = async (req, res) => {
  try {
    const message = req.body?.message?.trim();

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const analysis = await analyzeHealthMessage(message);
    return res.status(200).json(analysis);
  } catch (error) {
    console.error("Hybrid analysis failed:", error);

    return res.status(200).json({
      symptoms: [],
      normalized_symptoms: "No symptom details available",
      emotional_state: "None",
      possible_conditions: [
        { name: "General Health Concern", probability: 100 }
      ],
      condition: "General Health Issue",
      risk_level: "Medium",
      risk_score: 50,
      urgency_score: 5,
      recommended_doctor: "General Physician",
      explanation:
        "The system could not complete the full AI analysis, but your symptoms still deserve monitoring and a doctor review if they continue.",
      next_steps: [
        "Track symptom severity and duration.",
        "Consult a doctor if symptoms persist or worsen."
      ],
      advice: [
        "Track symptom severity and duration.",
        "Consult a doctor if symptoms persist or worsen."
      ],
      progression_if_ignored: {
        early_stage: "Symptoms may continue without clarity.",
        mid_stage: "Symptoms may become more noticeable or disruptive.",
        severe_stage: "Delayed care may make treatment and recovery harder."
      },
      prevention: [
        "Rest and stay hydrated.",
        "Seek urgent care if serious warning signs appear."
      ],
      emergency: null,
      disclaimer: "This is not a medical diagnosis. Please consult a qualified doctor."
    });
  }
};
