const MEDICAL_MAPPING = [
  {
    doctor: "General Physician",
    category: "infection",
    condition: "Viral Infection",
    risk_level: "Medium",
    risk_score: 58,
    keywords: ["fever", "viral fever", "body ache", "chills", "flu", "infection"]
  },
  {
    doctor: "General Physician",
    category: "infection",
    condition: "Upper Respiratory Infection",
    risk_level: "Low",
    risk_score: 34,
    keywords: ["cold", "cough", "sore throat", "runny nose", "congestion", "sneezing"]
  },
  {
    doctor: "Cardiologist",
    category: "cardiology",
    condition: "Cardiac Issue",
    risk_level: "High",
    risk_score: 95,
    keywords: [
      "chest pain",
      "chest pressure",
      "palpitations",
      "irregular heartbeat",
      "heart pain"
    ]
  },
  {
    doctor: "Cardiologist",
    category: "cardiology",
    condition: "Blood Pressure Fluctuation",
    risk_level: "Medium",
    risk_score: 64,
    keywords: ["bp", "blood pressure", "hypertension", "high bp", "low bp"]
  },
  {
    doctor: "Neurologist",
    category: "neurology",
    condition: "Neurological Condition",
    risk_level: "High",
    risk_score: 86,
    keywords: ["seizure", "tingling", "numbness", "memory loss", "fainting", "vertigo"]
  },
  {
    doctor: "Neurologist",
    category: "neurology",
    condition: "Headache Disorder",
    risk_level: "Medium",
    risk_score: 52,
    keywords: ["headache", "migraine", "head pain", "light sensitivity"]
  },
  {
    doctor: "Dermatologist",
    category: "dermatology",
    condition: "Skin Condition",
    risk_level: "Low",
    risk_score: 30,
    keywords: ["rash", "itching", "skin allergy", "eczema", "acne", "hives", "skin redness"]
  },
  {
    doctor: "Orthopedic Specialist",
    category: "orthopedic",
    condition: "Bone Fracture",
    risk_level: "High",
    risk_score: 90,
    keywords: ["fracture", "broken bone", "bone crack", "dislocated joint", "joint injury"]
  },
  {
    doctor: "Orthopedic Specialist",
    category: "orthopedic",
    condition: "Musculoskeletal Injury",
    risk_level: "Medium",
    risk_score: 62,
    keywords: ["sprain", "back pain", "knee pain", "joint pain", "swelling in joint"]
  },
  {
    doctor: "Gastroenterologist",
    category: "gastroenterology",
    condition: "Digestive Disorder",
    risk_level: "Medium",
    risk_score: 57,
    keywords: ["stomach pain", "abdominal pain", "acidity", "gastric", "ulcer", "indigestion"]
  },
  {
    doctor: "Gastroenterologist",
    category: "gastroenterology",
    condition: "Bowel Irritation",
    risk_level: "Medium",
    risk_score: 59,
    keywords: ["diarrhea", "constipation", "bloating", "vomiting", "nausea"]
  },
  {
    doctor: "Pulmonologist",
    category: "pulmonology",
    condition: "Respiratory Flare",
    risk_level: "High",
    risk_score: 79,
    keywords: [
      "asthma",
      "wheezing",
      "shortness of breath",
      "breathing trouble",
      "tight chest",
      "lung pain"
    ]
  },
  {
    doctor: "Nephrologist",
    category: "nephrology",
    condition: "Kidney-Related Condition",
    risk_level: "Medium",
    risk_score: 68,
    keywords: ["kidney pain", "creatinine", "swollen legs", "reduced urine", "foamy urine"]
  },
  {
    doctor: "Urologist",
    category: "urology",
    condition: "Urinary Tract Condition",
    risk_level: "Medium",
    risk_score: 61,
    keywords: ["urine burning", "painful urination", "blood in urine", "frequent urination"]
  },
  {
    doctor: "Endocrinologist",
    category: "endocrinology",
    condition: "Blood Sugar Imbalance",
    risk_level: "Medium",
    risk_score: 62,
    keywords: ["diabetes", "high sugar", "low sugar", "blood sugar", "thyroid", "hormonal issue"]
  },
  {
    doctor: "Gynecologist",
    category: "gynecology",
    condition: "Gynecological Condition",
    risk_level: "Medium",
    risk_score: 63,
    keywords: ["pelvic pain", "irregular periods", "heavy periods", "vaginal bleeding", "ovary pain"]
  },
  {
    doctor: "Pediatrician",
    category: "pediatrics",
    condition: "Pediatric Illness",
    risk_level: "Medium",
    risk_score: 56,
    keywords: ["child fever", "baby cough", "infant vomiting", "child rash", "baby breathing issue"]
  },
  {
    doctor: "Psychiatrist",
    category: "psychiatry",
    condition: "Mental Health Concern",
    risk_level: "Medium",
    risk_score: 60,
    keywords: ["anxiety", "panic attack", "depression", "insomnia", "suicidal thoughts", "hallucination"]
  },
  {
    doctor: "Oncologist",
    category: "oncology",
    condition: "Possible Cancer-Related Condition",
    risk_level: "High",
    risk_score: 92,
    keywords: ["tumor", "lump", "cancer", "unexplained weight loss", "mass"]
  },
  {
    doctor: "ENT Specialist",
    category: "ent",
    condition: "Ear, Nose, or Throat Condition",
    risk_level: "Low",
    risk_score: 38,
    keywords: ["ear pain", "sinus pain", "tonsil", "loss of voice", "ear discharge"]
  },
  {
    doctor: "Ophthalmologist",
    category: "ophthalmology",
    condition: "Eye Condition",
    risk_level: "Medium",
    risk_score: 55,
    keywords: ["blurred vision", "eye pain", "red eye", "loss of vision", "eye irritation"]
  },
  {
    doctor: "Dentist",
    category: "dental",
    condition: "Dental Condition",
    risk_level: "Low",
    risk_score: 35,
    keywords: ["tooth pain", "gum bleeding", "jaw swelling", "dental cavity", "mouth pain"]
  },
  {
    doctor: "Rheumatologist",
    category: "rheumatology",
    condition: "Inflammatory Joint Condition",
    risk_level: "Medium",
    risk_score: 58,
    keywords: ["arthritis", "autoimmune joint pain", "morning stiffness", "multiple joint swelling"]
  }
];

const containsAny = (text, patterns) => patterns.some((pattern) => text.includes(pattern));

const riskRank = {
  Low: 1,
  Medium: 2,
  High: 3
};

export const rankMedicalMatches = (symptoms = [], message = "") => {
  const searchable = `${symptoms.join(" ")} ${message}`.toLowerCase();

  return MEDICAL_MAPPING.map((entry) => ({
    ...entry,
    matched_keywords: entry.keywords.filter((keyword) => searchable.includes(keyword))
  }))
    .filter((entry) => entry.matched_keywords.length > 0)
    .sort(
      (a, b) =>
        riskRank[b.risk_level] - riskRank[a.risk_level] ||
        b.matched_keywords.length - a.matched_keywords.length ||
        b.risk_score - a.risk_score
    );
};

export const mapMedicalInput = (symptoms = [], message = "") => {
  const ranked = rankMedicalMatches(symptoms, message);
  const bestMatch =
    ranked[0] ||
    {
      doctor: "General Physician",
      category: "general",
      condition: "General Health Issue",
      risk_level: "Medium",
      risk_score: 50,
      matched_keywords: []
    };

  return {
    symptoms,
    condition: bestMatch.condition,
    risk_level: bestMatch.risk_level,
    risk_score: bestMatch.risk_score,
    recommended_doctor: bestMatch.doctor,
    matched_keywords: bestMatch.matched_keywords,
    category: bestMatch.category
  };
};

export const medicalMappingDataset = MEDICAL_MAPPING;

export const hasMedicalMatch = (message = "", symptoms = []) =>
  MEDICAL_MAPPING.some((entry) =>
    containsAny(`${message} ${symptoms.join(" ")}`.toLowerCase(), entry.keywords)
  );
