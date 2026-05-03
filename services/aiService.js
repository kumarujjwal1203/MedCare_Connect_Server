import { askBioMistral } from "./biomistral.service.js";
import { askGemini } from "./gemini.service.js";
import { askGPT } from "./gpt.service.js";

const buildReasoningPrompt = ({ message, analysis, memoryContext = "", historyContext = "" }) => `
You are an advanced medical reasoning assistant for a healthcare chatbot.

User message: ${message}
Extracted symptoms: ${analysis.symptoms.join(", ") || "None"}
Rule-based condition: ${analysis.condition}
Rule-based risk level: ${analysis.risk_level}
Rule-based risk score: ${analysis.risk_score}
Rule-based doctor: ${analysis.recommended_doctor}
Relevant memory: ${memoryContext || "None"}
Recent chat context: ${historyContext || "None"}

IMPORTANT RULES:
- Do not change the condition.
- Do not change the risk level.
- Do not change the risk score.
- Do not change the recommended doctor.
- Only generate a short explanation, next steps, and prevention tips.
- Keep the answer symptom-specific and medically sensible.
- Avoid generic wording and avoid repeating the same explanation used for every symptom.
- Use recent context only to avoid repetitive advice.
- Return JSON only.

Return exactly:
{
  "explanation": "Short explanation",
  "next_steps": ["step 1", "step 2"],
  "prevention": ["tip 1", "tip 2"]
}
`;

const parseReasoning = (content) => {
  const jsonStart = content.indexOf("{");
  const jsonEnd = content.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("No JSON found in AI reasoning response");
  }

  return JSON.parse(content.slice(jsonStart, jsonEnd + 1));
};

const fallbackReasoningMap = {
  critical: {
    explanation:
      "Your symptom pattern includes warning signs that need urgent specialist assessment rather than delay.",
    next_steps: [
      "Seek urgent in-person medical care immediately.",
      "Do not ignore rapidly worsening symptoms or sudden weakness, bleeding, or severe pain."
    ],
    prevention: [
      "Keep emergency contacts and prior medical records ready.",
      "Do not self-medicate for severe symptoms without clinical evaluation."
    ]
  },
  cardiology: {
    explanation:
      "These symptoms fit a cardiovascular concern that deserves timely assessment to rule out serious complications.",
    next_steps: [
      "Arrange urgent cardiac evaluation if pain, pressure, or breathlessness continues.",
      "Limit exertion and track associated symptoms like sweating or dizziness."
    ],
    prevention: [
      "Monitor blood pressure and avoid ignoring recurrent chest symptoms.",
      "Maintain follow-up for cholesterol, BP, and cardiac risk factors."
    ]
  },
  orthopedic: {
    explanation:
      "The symptom pattern suggests a bone or joint injury that may need imaging, stabilization, and movement restriction.",
    next_steps: [
      "Immobilize the affected area and reduce strain.",
      "Seek orthopedic review for proper examination and imaging."
    ],
    prevention: [
      "Avoid weight-bearing or repeat trauma until assessed.",
      "Use protective support and reduce fall risk."
    ]
  },
  infection: {
    explanation:
      "These symptoms are consistent with an infectious illness pattern and should be monitored for escalation.",
    next_steps: [
      "Track fever, hydration, and whether symptoms are spreading or worsening.",
      "Consult a doctor if symptoms persist or new breathing issues appear."
    ],
    prevention: [
      "Rest, hydrate well, and reduce exposure to others if contagious illness is possible.",
      "Support recovery with sleep and hygiene precautions."
    ]
  },
  general: {
    explanation:
      "Your symptoms need structured monitoring and a clinician review if they continue, intensify, or change pattern.",
    next_steps: [
      "Track symptom timing, severity, and triggers.",
      "Book a medical consultation if symptoms persist."
    ],
    prevention: [
      "Stay hydrated and avoid overexertion while symptoms are active.",
      "Seek care early if new warning signs develop."
    ]
  }
};

const buildFallbackReasoning = (analysis) =>
  fallbackReasoningMap[analysis.category] || fallbackReasoningMap.general;

export const generateMedicalReasoning = async ({ message, analysis }) => {
  const prompt = buildReasoningPrompt({
    message,
    analysis,
    memoryContext: analysis.memory_context,
    historyContext: analysis.history_context
  });

  try {
    return parseReasoning(await askBioMistral(prompt));
  } catch (bioMistralError) {
    try {
      return parseReasoning(await askGemini(prompt));
    } catch (geminiError) {
      try {
        return parseReasoning(await askGPT(prompt));
      } catch (openAiError) {
        console.warn(
          "AI reasoning unavailable, using fallback:",
          bioMistralError.message,
          geminiError.message,
          openAiError.message
        );
        return buildFallbackReasoning(analysis);
      }
    }
  }
};
