export class ExplainableAIService {
  constructor() {
    this.symptomWeight = {
      common: 1.0,
      moderate: 1.5,
      severe: 2.0,
      pathognomonic: 3.0
    };

    this.conditionSymptomMap = {
      "Common Cold": {
        symptoms: ["cough", "runny nose", "sneezing", "sore throat", "mild fever"],
        weight: "common"
      },
      "Flu (Influenza)": {
        symptoms: ["fever", "body ache", "fatigue", "cough", "headache"],
        weight: "common"
      },
      "Gastroenteritis": {
        symptoms: ["vomiting", "diarrhea", "stomach pain", "nausea", "fever"],
        weight: "common"
      },
      "Migraine": {
        symptoms: ["headache", "nausea", "sensitivity to light", "visual disturbance"],
        weight: "moderate"
      },
      "Hypertension": {
        symptoms: ["headache", "dizziness", "shortness of breath", "nosebleed"],
        weight: "moderate"
      },
      "Diabetes Type 2": {
        symptoms: ["increased thirst", "frequent urination", "fatigue", "blurred vision", "slow healing"],
        weight: "moderate"
      },
      "Anxiety Disorder": {
        symptoms: ["worry", "restlessness", "rapid heartbeat", "sweating", "trembling"],
        weight: "moderate"
      },
      "Depression": {
        symptoms: ["sadness", "fatigue", "loss of interest", "sleep changes", "appetite changes"],
        weight: "moderate"
      },
      "Asthma": {
        symptoms: ["wheezing", "shortness of breath", "chest tightness", "coughing"],
        weight: "moderate"
      },
      "Pneumonia": {
        symptoms: ["fever", "cough", "chest pain", "shortness of breath", "fatigue"],
        weight: "severe"
      },
      "Heart Disease": {
        symptoms: ["chest pain", "shortness of breath", "fatigue", "swelling", "irregular heartbeat"],
        weight: "severe"
      },
      "Appendicitis": {
        symptoms: ["abdominal pain", "fever", "nausea", "vomiting", "loss of appetite"],
        weight: "severe"
      },
      "UTI (Urinary Tract Infection)": {
        symptoms: ["burning urination", "frequent urination", "cloudy urine", "pelvic pain"],
        weight: "common"
      },
      "Allergic Reaction": {
        symptoms: ["rash", "itching", "swelling", "hives", "difficulty breathing"],
        weight: "moderate"
      },
      "Anemia": {
        symptoms: ["fatigue", "weakness", "pale skin", "dizziness", "shortness of breath"],
        weight: "moderate"
      }
    };
  }

  analyzeReasoning(userMessage, symptoms, memory, userProfile) {
    const reasoning = {
      primaryReasoning: [],
      symptomContributions: [],
      historicalFactors: [],
      riskModifiers: [],
      conclusion: "",
      confidenceFactors: []
    };

    const lowerMessage = userMessage.toLowerCase();

    symptoms.forEach(symptom => {
      const matchedConditions = this.findMatchingConditions(symptom);
      
      matchedConditions.forEach(match => {
        reasoning.symptomContributions.push({
          symptom: symptom,
          condition: match.condition,
          weight: match.weight,
          contribution: `Patients with "${symptom}" often present with: ${match.condition}`
        });
      });
    });

    if (memory?.pastDiagnoses?.length > 0) {
      memory.pastDiagnoses.forEach(diagnosis => {
        const hasHistoryRelevance = symptoms.some(s => 
          this.conditionSymptomMap[diagnosis]?.symptoms.some(cs => 
            s.toLowerCase().includes(cs)
          )
        );

        if (hasHistoryRelevance) {
          reasoning.historicalFactors.push({
            factor: diagnosis,
            relevance: "Previous diagnosis may be related to current symptoms",
            importance: "high"
          });
        }
      });
    }

    if (userProfile?.chronicConditions?.length > 0) {
      userProfile.chronicConditions.forEach(condition => {
        const affectsSymptoms = symptoms.some(s =>
          this.conditionSymptomMap[condition]?.symptoms.some(cs =>
            s.toLowerCase().includes(cs)
          )
        );

        if (affectsSymptoms) {
          reasoning.riskModifiers.push({
            condition: condition,
            impact: "Your existing condition may influence current symptoms",
            severity: "important"
          });
        }
      });
    }

    if (userProfile?.allergies?.length > 0) {
      const allergyMentioned = userProfile.allergies.some(a =>
        lowerMessage.includes(a.toLowerCase())
      );

      if (allergyMentioned) {
        reasoning.riskModifiers.push({
          factor: "Allergy Alert",
          impact: "You mentioned an allergen. Monitor for allergic reaction symptoms.",
          severity: "important"
        });
      }
    }

    if (symptoms.length >= 3) {
      reasoning.confidenceFactors.push({
        factor: "Symptom Cluster",
        impact: `Having ${symptoms.length} symptoms increases diagnostic confidence`,
        positive: true
      });
    } else {
      reasoning.confidenceFactors.push({
        factor: "Limited Information",
        impact: "Fewer symptoms may lead to less accurate predictions",
        positive: false
      });
    }

    const matchingConditions = this.findAllMatchingConditions(symptoms);
    if (matchingConditions.length > 0) {
      reasoning.primaryReasoning = matchingConditions.slice(0, 3).map(match => ({
        condition: match.condition,
        matchScore: match.score,
        explanation: this.generateConditionExplanation(match.condition, symptoms, userProfile)
      }));

      reasoning.conclusion = this.generateConclusion(reasoning.primaryReasoning, symptoms);
    }

    return reasoning;
  }

  findMatchingConditions(symptom) {
    const matches = [];
    const lowerSymptom = symptom.toLowerCase();

    Object.entries(this.conditionSymptomMap).forEach(([condition, data]) => {
      data.symptoms.forEach(conditionSymptom => {
        if (lowerSymptom.includes(conditionSymptom) || conditionSymptom.includes(lowerSymptom)) {
          matches.push({
            condition,
            matchStrength: 1,
            weight: data.weight
          });
        }
      });
    });

    return matches;
  }

  findAllMatchingConditions(symptoms) {
    const conditionScores = {};

    symptoms.forEach(symptom => {
      const lowerSymptom = symptom.toLowerCase();

      Object.entries(this.conditionSymptomMap).forEach(([condition, data]) => {
        if (!conditionScores[condition]) {
          conditionScores[condition] = {
            condition,
            score: 0,
            matchedSymptoms: [],
            weight: data.weight
          };
        }

        data.symptoms.forEach(conditionSymptom => {
          if (lowerSymptom.includes(conditionSymptom) || conditionSymptom.includes(lowerSymptom)) {
            const weight = this.symptomWeight[data.weight] || 1;
            conditionScores[condition].score += weight;
            conditionScores[condition].matchedSymptoms.push(symptom);
          }
        });
      });
    });

    return Object.values(conditionScores)
      .filter(c => c.matchedSymptoms.length > 0)
      .sort((a, b) => b.score - a.score);
  }

  generateConditionExplanation(condition, symptoms, userProfile) {
    const conditionData = this.conditionSymptomMap[condition];
    if (!conditionData) return "";

    const matched = symptoms.filter(s => 
      conditionData.symptoms.some(cs => 
        s.toLowerCase().includes(cs) || cs.includes(s.toLowerCase())
      )
    );

    let explanation = `Based on symptoms: "${matched.join(', ')}"`;

    if (userProfile?.age && condition === "Hypertension") {
      if (userProfile.age > 50) {
        explanation += ". Age >50 increases risk for hypertension.";
      }
    }

    if (userProfile?.chronicConditions?.includes(condition)) {
      explanation += `. Note: You have been diagnosed with ${condition} before.`;
    }

    return explanation;
  }

  generateConclusion(primaryReasoning, symptoms) {
    if (primaryReasoning.length === 0) {
      return "Unable to determine a specific condition pattern. Please provide more detailed symptoms.";
    }

    const topMatch = primaryReasoning[0];
    const symptomCount = symptoms.length;

    return `Analysis suggests ${topMatch.condition} as the most likely condition ` +
           `based on ${symptomCount} symptom(s) matching the typical presentation pattern.`;
  }

  formatReasoningResponse(reasoning) {
    let response = "## Analysis Explanation\n\n";

    if (reasoning.primaryReasoning.length > 0) {
      response += "### Top Probable Conditions\n";
      reasoning.primaryReasoning.forEach((pr, i) => {
        response += `${i + 1}. **${pr.condition}** (Match Score: ${pr.score.toFixed(1)})\n`;
        response += `   ${pr.explanation}\n\n`;
      });
    }

    if (reasoning.symptomContributions.length > 0) {
      response += "### Symptom Analysis\n";
      reasoning.symptomContributions.slice(0, 5).forEach(sc => {
        response += `- **"${sc.symptom}"** → ${sc.contribution}\n`;
      });
      response += "\n";
    }

    if (reasoning.historicalFactors.length > 0) {
      response += "### Relevant Medical History\n";
      reasoning.historicalFactors.forEach(hf => {
        response += `- ${hf.factor}: ${hf.relevance}\n`;
      });
      response += "\n";
    }

    if (reasoning.riskModifiers.length > 0) {
      response += "### Risk Modifiers\n";
      reasoning.riskModifiers.forEach(rm => {
        response += `- **${rm.condition || rm.factor}**: ${rm.impact}\n`;
      });
      response += "\n";
    }

    response += `### Conclusion\n${reasoning.conclusion}`;

    return response;
  }
}

export const explainableAI = new ExplainableAIService();
