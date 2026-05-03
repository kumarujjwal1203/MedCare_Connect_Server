const NON_MEDICAL_PATTERNS = [
  "hello",
  "hi",
  "hey",
  "good morning",
  "good evening",
  "how are you"
];

const VAGUE_PATTERNS = [
  "not feeling well",
  "feeling unwell",
  "not okay",
  "sick",
  "pain",
  "problem",
  "issue"
];

const containsAny = (text, patterns) => patterns.some((pattern) => text.includes(pattern));

export const handleEdgeCases = (message = "", symptoms = []) => {
  const normalized = message.trim().toLowerCase();
  const wordCount = normalized.split(/\s+/).filter(Boolean).length;

  if (!normalized) {
    return {
      symptoms: [],
      condition: "No symptom information provided",
      risk_level: "Low",
      risk_score: 0,
      recommended_doctor: "General Physician",
      explanation:
        "No symptom details were shared, so a symptom-based health assessment cannot be made yet.",
      next_steps: [
        "Describe the main symptom, where it is happening, and how long it has been present.",
        "Mention severity or any associated warning signs for a more useful assessment."
      ],
      prevention: [
        "Monitor for any new or worsening symptoms.",
        "Seek urgent care if severe symptoms develop suddenly."
      ],
      category: "edge_case"
    };
  }

  if (containsAny(normalized, NON_MEDICAL_PATTERNS) && symptoms.length === 0) {
    return {
      symptoms: [],
      condition: "No medical symptom detected",
      risk_level: "Low",
      risk_score: 5,
      recommended_doctor: "General Physician",
      explanation:
        "No specific medical symptom was detected in the message, so a health risk assessment is not appropriate yet.",
      next_steps: [
        "Share the symptom, body part involved, and how long it has been happening.",
        "Include severity or any warning signs such as bleeding, breathlessness, or chest pain."
      ],
      prevention: [
        "Keep note of any symptoms if they begin later.",
        "Seek medical care promptly if urgent symptoms appear."
      ],
      category: "edge_case"
    };
  }

  if ((wordCount <= 2 && containsAny(normalized, VAGUE_PATTERNS)) || normalized === "pain") {
    return {
      symptoms: symptoms.length ? symptoms : ["pain"],
      condition: "Unclear symptom pattern",
      risk_level: "Medium",
      risk_score: 45,
      recommended_doctor: "General Physician",
      explanation:
        "The symptom description is too short to safely identify the affected system, so a general review is the safest next step.",
      next_steps: [
        "Clarify the body part, severity, and duration of the symptom.",
        "Seek prompt care if the pain is severe, sudden, or worsening."
      ],
      prevention: [
        "Track when the symptom started and what makes it better or worse.",
        "Do not ignore new red-flag symptoms such as chest pain or heavy bleeding."
      ],
      category: "edge_case"
    };
  }

  if (containsAny(normalized, VAGUE_PATTERNS) && symptoms.length === 0) {
    return {
      symptoms: [],
      condition: "General health concern",
      risk_level: "Medium",
      risk_score: 48,
      recommended_doctor: "General Physician",
      explanation:
        "The current description is vague, so a general medical review is more appropriate until clearer symptom details are available.",
      next_steps: [
        "Describe the main body part involved, the duration, and whether symptoms are worsening.",
        "Consult a doctor if you also have fever, breathing trouble, chest pain, or persistent weakness."
      ],
      prevention: [
        "Rest, hydrate, and monitor whether new symptoms appear.",
        "Seek urgent help quickly if severe warning signs develop."
      ],
      category: "edge_case"
    };
  }

  return null;
};
