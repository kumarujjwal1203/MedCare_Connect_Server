const BODY_PART_MAPPING = [
  {
    bodyPart: "ear",
    condition: "Ear Condition",
    risk_level: "Medium",
    risk_score: 52,
    recommended_doctor: "ENT Specialist",
    keywords: ["ear", "ear pain", "ear discharge", "hearing loss", "blocked ear"]
  },
  {
    bodyPart: "eye",
    condition: "Eye Condition",
    risk_level: "Medium",
    risk_score: 55,
    recommended_doctor: "Ophthalmologist",
    keywords: ["eye", "blurred vision", "eye pain", "red eye", "vision loss"]
  },
  {
    bodyPart: "skin",
    condition: "Skin Condition",
    risk_level: "Low",
    risk_score: 30,
    recommended_doctor: "Dermatologist",
    keywords: ["skin", "rash", "itching", "eczema", "hives", "acne", "skin redness"]
  },
  {
    bodyPart: "tooth",
    condition: "Dental Condition",
    risk_level: "Low",
    risk_score: 35,
    recommended_doctor: "Dentist",
    keywords: ["tooth", "teeth", "gum", "gum bleeding", "dental", "mouth pain", "jaw swelling"]
  },
  {
    bodyPart: "chest",
    condition: "Chest-Related Condition",
    risk_level: "High",
    risk_score: 92,
    recommended_doctor: "Cardiologist",
    keywords: ["chest", "chest pain", "chest pressure", "pain in chest", "tight chest"]
  },
  {
    bodyPart: "brain/head",
    condition: "Neurological or Head-Related Condition",
    risk_level: "Medium",
    risk_score: 58,
    recommended_doctor: "Neurologist",
    keywords: ["brain", "head", "headache", "migraine", "head pain", "head spinning"]
  },
  {
    bodyPart: "bone/joint",
    condition: "Bone or Joint Condition",
    risk_level: "Medium",
    risk_score: 62,
    recommended_doctor: "Orthopedic Specialist",
    keywords: ["bone", "joint", "knee", "hip", "shoulder", "ankle", "fracture", "sprain"]
  }
];

export const detectBodyPartPriority = (message = "", symptoms = []) => {
  const searchable = `${message} ${symptoms.join(" ")}`.toLowerCase();

  const matches = BODY_PART_MAPPING.map((entry) => ({
    ...entry,
    matched_keywords: entry.keywords.filter((keyword) => searchable.includes(keyword))
  }))
    .filter((entry) => entry.matched_keywords.length > 0)
    .sort((a, b) => b.risk_score - a.risk_score || b.matched_keywords.length - a.matched_keywords.length);

  if (!matches.length) {
    return null;
  }

  const best = matches[0];

  return {
    symptoms,
    condition: best.condition,
    risk_level: best.risk_level,
    risk_score: best.risk_score,
    recommended_doctor: best.recommended_doctor,
    matched_keywords: best.matched_keywords,
    category: "body_part",
    body_part: best.bodyPart
  };
};
