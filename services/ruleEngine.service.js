const containsAny = (text, patterns) => patterns.some((pattern) => text.includes(pattern));

export const classifySymptoms = (symptoms = [], message = "") => {
  const joined = `${symptoms.join(" ")} ${message}`.toLowerCase();

  if (containsAny(joined, ["fracture", "broken bone"])) {
    return {
      symptoms,
      condition: "Bone Fracture",
      risk_level: "High",
      risk_score: 90,
      recommended_doctor: "Orthopedic Specialist"
    };
  }

  if (containsAny(joined, ["chest pain"])) {
    return {
      symptoms,
      condition: "Cardiac Issue",
      risk_level: "High",
      risk_score: 95,
      recommended_doctor: "Cardiologist"
    };
  }

  if (containsAny(joined, ["covid"])) {
    return {
      symptoms,
      condition: "Possible COVID-19",
      risk_level: "High",
      risk_score: 85,
      recommended_doctor: "Infectious Disease Specialist"
    };
  }

  if (containsAny(joined, ["wound", "bleeding", "burn"])) {
    return {
      symptoms,
      condition: "Acute Soft Tissue Injury",
      risk_level: "High",
      risk_score: 82,
      recommended_doctor: "Emergency Medicine Specialist"
    };
  }

  if (containsAny(joined, ["fever"])) {
    return {
      symptoms,
      condition: "Viral Infection",
      risk_level: "Medium",
      risk_score: 60,
      recommended_doctor: "General Physician"
    };
  }

  if (containsAny(joined, ["cold", "cough", "sore throat"])) {
    return {
      symptoms,
      condition: "Upper Respiratory Infection",
      risk_level: "Low",
      risk_score: 34,
      recommended_doctor: "General Physician"
    };
  }

  if (containsAny(joined, ["headache", "migraine", "stomach pain"])) {
    return {
      symptoms,
      condition: "Pain-Related Condition",
      risk_level: "Medium",
      risk_score: 54,
      recommended_doctor: "General Physician"
    };
  }

  if (containsAny(joined, ["bp", "blood pressure", "hypertension"])) {
    return {
      symptoms,
      condition: "Blood Pressure Fluctuation",
      risk_level: "Medium",
      risk_score: 64,
      recommended_doctor: "Cardiologist"
    };
  }

  if (containsAny(joined, ["diabetes", "sugar"])) {
    return {
      symptoms,
      condition: "Blood Sugar Imbalance",
      risk_level: "Medium",
      risk_score: 62,
      recommended_doctor: "Endocrinologist"
    };
  }

  if (containsAny(joined, ["asthma", "wheezing", "shortness of breath", "breathing trouble"])) {
    return {
      symptoms,
      condition: "Respiratory Flare",
      risk_level: "High",
      risk_score: 79,
      recommended_doctor: "Pulmonologist"
    };
  }

  if (containsAny(joined, ["skin", "rash", "itching", "acne"])) {
    return {
      symptoms,
      condition: "Skin Condition",
      risk_level: "Low",
      risk_score: 32,
      recommended_doctor: "Dermatologist"
    };
  }

  return {
    symptoms,
    condition: "General Health Issue",
    risk_level: "Medium",
    risk_score: 50,
    recommended_doctor: "General Physician"
  };
};
