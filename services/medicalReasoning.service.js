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
- Use the recent chat context only to avoid repetitive advice and to mention recurrence when appropriate.
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

const buildFallbackReasoning = (analysis) => {
  const fallbackMap = {
    "Bone Fracture": {
      explanation:
        "Fracture-like symptoms suggest a bone injury that usually needs prompt examination and imaging.",
      next_steps: [
        "Keep the affected area still and avoid weight-bearing.",
        "Seek urgent orthopedic or emergency care for imaging."
      ],
      prevention: [
        "Use support or splinting until evaluated.",
        "Reduce further strain or fall risk around the injury."
      ]
    },
    "Cardiac Issue": {
      explanation:
        "Chest pain can reflect a heart-related problem, so urgent medical evaluation is important.",
      next_steps: [
        "Get urgent in-person medical help immediately.",
        "Avoid exertion and monitor for breathlessness or dizziness."
      ],
      prevention: [
        "Track recurrent chest symptoms and known triggers.",
        "Maintain heart-healthy follow-up if you have prior BP or cardiac history."
      ]
    },
    "Possible COVID-19": {
      explanation:
        "COVID-like symptoms may indicate a contagious respiratory illness and need close monitoring.",
      next_steps: [
        "Limit contact with others and arrange testing or medical review.",
        "Watch for worsening breathing, fever, or dehydration."
      ],
      prevention: [
        "Use masking and hygiene precautions when infection is possible.",
        "Rest, hydrate, and isolate appropriately if symptoms worsen."
      ]
    },
    "Viral Infection": {
      explanation:
        "Fever commonly points to a viral or flu-like infection, especially with recent body ache or throat symptoms.",
      next_steps: [
        "Monitor temperature and hydration through the day.",
        "See a doctor if fever persists or becomes more intense."
      ],
      prevention: [
        "Rest well and increase fluids.",
        "Avoid close exposure to others if infection is suspected."
      ]
    },
    "General Health Issue": {
      explanation:
        "Your symptoms need monitoring and a focused medical review if they continue or become more intense.",
      next_steps: [
        "Track symptom timing, triggers, and severity.",
        "Book a general medical consultation if symptoms persist."
      ],
      prevention: [
        "Stay hydrated and rest while monitoring changes.",
        "Seek timely follow-up if new warning signs appear."
      ]
    }
  };

  return fallbackMap[analysis.condition] || fallbackMap["General Health Issue"];
};

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
          "AI reasoning unavailable, using rule fallback:",
          bioMistralError.message,
          geminiError.message,
          openAiError.message
        );
        return buildFallbackReasoning(analysis);
      }
    }
  }
};
