const HIGH_RISK_CONDITIONS = [
  "diabetes", "hypertension", "heart disease", "cancer", "stroke",
  "asthma", "copd", "kidney disease", "liver disease", "hiv",
  "epilepsy", "tuberculosis", "malaria", "dengue", "chronic"
];

const MODERATE_RISK_CONDITIONS = [
  "anxiety", "depression", "arthritis", "osteoporosis", "anemia",
  "thyroid", "allergy", "migraine", "back pain", "obesity"
];

const RISK_SYMPTOMS = [
  "chest pain", "shortness of breath", "unexplained weight loss",
  "persistent fever", "blood in stool", "blood in urine",
  "severe headache", "numbness", "vision loss", "confusion",
  "irregular heartbeat", "swelling", "fatigue"
];

const AGE_RISK_FACTORS = {
  pediatric: { min: 0, max: 12, factor: 1.0 },
  adolescent: { min: 13, max: 18, factor: 1.0 },
  youngAdult: { min: 19, max: 35, factor: 1.0 },
  middleAge: { min: 36, max: 55, factor: 1.2 },
  senior: { min: 56, max: 120, factor: 1.5 }
};

export const calculateRisk = (records = [], user = null) => {
  let score = 0;
  const riskFactors = [];
  const recommendations = [];

  if (user) {
    const ageGroup = Object.values(AGE_RISK_FACTORS).find(
      (g) => user.age >= g.min && user.age <= g.max
    );
    const ageFactor = ageGroup?.factor || 1.0;

    if (ageFactor > 1.0) {
      riskFactors.push({
        factor: "Age Risk",
        impact: Math.round((ageFactor - 1) * 30),
        description: `Age group ${user.age} years increases health risk`
      });
    }

    if (user.chronicConditions?.length > 0) {
      user.chronicConditions.forEach((condition) => {
        const lowerCondition = condition.toLowerCase();
        if (HIGH_RISK_CONDITIONS.some((h) => lowerCondition.includes(h))) {
          score += 15;
          riskFactors.push({
            factor: "Chronic Condition",
            impact: 15,
            description: `High-risk condition: ${condition}`
          });
        } else if (MODERATE_RISK_CONDITIONS.some((m) => lowerCondition.includes(m))) {
          score += 8;
          riskFactors.push({
            factor: "Chronic Condition",
            impact: 8,
            description: `Moderate-risk condition: ${condition}`
          });
        }
      });
    }

    if (user.allergies?.length > 0) {
      score += 5;
      riskFactors.push({
        factor: "Allergies",
        impact: 5,
        description: `${user.allergies.length} documented allergies`
      });
    }
  }

  const recordCount = records.length;
  score += Math.min(recordCount * 3, 30);

  if (recordCount > 10) {
    riskFactors.push({
      factor: "Health Records",
      impact: Math.min(recordCount * 3, 30),
      description: `${recordCount} health interactions on record`
    });
  }

  records.forEach((record) => {
    if (record.symptoms) {
      record.symptoms.forEach((symptom) => {
        const lowerSymptom = symptom.toLowerCase();
        if (RISK_SYMPTOMS.some((rs) => lowerSymptom.includes(rs))) {
          const existingFactor = riskFactors.find(
            (rf) => rf.description.toLowerCase().includes(symptom.toLowerCase())
          );
          if (!existingFactor) {
            score += 5;
            riskFactors.push({
              factor: "Symptom Alert",
              impact: 5,
              description: `High-risk symptom: ${symptom}`
            });
          }
        }
      });
    }

    if (record.diagnosis) {
      const lowerDiagnosis = record.diagnosis.toLowerCase();
      if (HIGH_RISK_CONDITIONS.some((h) => lowerDiagnosis.includes(h))) {
        score += 10;
      }
    }
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentRecords = records.filter(
    (r) => new Date(r.createdAt) > thirtyDaysAgo
  );
  if (recentRecords.length > 3) {
    score += 10;
    riskFactors.push({
      factor: "Recent Activity",
      impact: 10,
      description: `${recentRecords.length} health interactions in last 30 days`
    });
    recommendations.push("Consider scheduling a comprehensive health checkup");
  }

  const finalScore = Math.min(Math.max(score, 0), 100);

  let level;
  if (finalScore >= 70) {
    level = "High";
    recommendations.push("Consult a healthcare provider soon");
    recommendations.push("Monitor symptoms closely");
  } else if (finalScore >= 40) {
    level = "Moderate";
    recommendations.push("Schedule routine checkup");
    recommendations.push("Maintain healthy lifestyle");
  } else {
    level = "Low";
    recommendations.push("Continue preventive care");
    recommendations.push("Stay active and maintain balanced diet");
  }

  if (user?.allergies?.length > 2) {
    recommendations.push("Consider allergy consultation");
  }

  return {
    riskScore: finalScore,
    level,
    riskFactors: riskFactors.slice(0, 10),
    recommendations: recommendations.slice(0, 5),
    summary: {
      totalRecords: recordCount,
      recentRecords: recentRecords.length,
      chronicConditions: user?.chronicConditions?.length || 0,
      documentedAllergies: user?.allergies?.length || 0
    }
  };
};
