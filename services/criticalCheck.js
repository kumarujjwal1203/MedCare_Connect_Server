const CRITICAL_CONDITIONS = [
  {
    condition: "Possible Heart Attack",
    doctor: "Cardiologist",
    risk_level: "High",
    risk_score: 98,
    keywords: [
      "heart attack",
      "crushing chest pain",
      "pain in left arm",
      "jaw pain with chest pain",
      "sudden chest pressure"
    ]
  },
  {
    condition: "Possible Stroke",
    doctor: "Neurologist",
    risk_level: "High",
    risk_score: 97,
    keywords: [
      "stroke",
      "face drooping",
      "slurred speech",
      "one sided weakness",
      "sudden paralysis"
    ]
  },
  {
    condition: "Possible Internal Bleeding",
    doctor: "Emergency Medicine Specialist",
    risk_level: "High",
    risk_score: 96,
    keywords: [
      "internal bleeding",
      "vomiting blood",
      "blood in vomit",
      "black stool",
      "blood in stool",
      "severe bleeding"
    ]
  },
  {
    condition: "Possible Cancer-Related Condition",
    doctor: "Oncologist",
    risk_level: "High",
    risk_score: 94,
    keywords: [
      "cancer",
      "tumor",
      "malignancy",
      "mass in body",
      "unexplained lump",
      "blood cancer"
    ]
  },
  {
    condition: "Severe Traumatic Injury",
    doctor: "Emergency Medicine Specialist",
    risk_level: "High",
    risk_score: 95,
    keywords: [
      "severe injury",
      "open fracture",
      "major accident",
      "deep wound",
      "head injury with bleeding",
      "unconscious after fall"
    ]
  }
];

const containsAny = (text, patterns) => patterns.some((pattern) => text.includes(pattern));

export const detectCriticalCondition = (message = "", symptoms = []) => {
  const searchable = `${message} ${symptoms.join(" ")}`.toLowerCase();

  const match = CRITICAL_CONDITIONS.find((item) => containsAny(searchable, item.keywords));

  if (!match) {
    return null;
  }

  return {
    symptoms,
    condition: match.condition,
    risk_level: match.risk_level,
    risk_score: match.risk_score,
    recommended_doctor: match.doctor,
    matched_keywords: match.keywords.filter((keyword) => searchable.includes(keyword)),
    category: "critical"
  };
};
