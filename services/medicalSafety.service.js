export const EMERGENCY_KEYWORDS = [
  { pattern: /chest\s*pain.*(trouble|difficulty|problem|hard).*breath/i, condition: "Possible Heart Attack", severity: "emergency" },
  { pattern: /(trouble|difficulty|problem|hard).*breath.*chest\s*pain/i, condition: "Possible Heart Attack", severity: "emergency" },
  { pattern: /chest\s*pain.*sweat/i, condition: "Possible Heart Attack", severity: "emergency" },
  { pattern: /sweat.*chest\s*pain/i, condition: "Possible Heart Attack", severity: "emergency" },
  { pattern: /difficulty\s*breathing|can'?t\s*breathe|shortness\s*of\s*breath.*severe/i, condition: "Respiratory Emergency", severity: "emergency" },
  { pattern: /unconscious|unresponsive|passed\s*out/i, condition: "Unconsciousness", severity: "emergency" },
  { pattern: /seizure|convulsion|fitting/i, condition: "Seizure", severity: "emergency" },
  { pattern: /severe\s*bleeding|can't\s*stop\s*bleeding/i, condition: "Severe Bleeding", severity: "emergency" },
  { pattern: /choking|can'?t\s*breathe.*food/i, condition: "Choking", severity: "emergency" },
  { pattern: /overdose|drug\s*overdose|took\s*too\s*many/i, condition: "Drug Overdose", severity: "emergency" },
  { pattern: /suicide|self[\s-]harm|want\s*to\s*die/i, condition: "Mental Health Crisis", severity: "emergency" },
  { pattern: /stroke.*face.*droop|face.*droop.*arm.*weak|slurred\s*speech/i, condition: "Stroke Warning Signs", severity: "emergency" },
  { pattern: /allergic\s*reaction.*anaphylax/i, condition: "Anaphylaxis", severity: "emergency" },
  { pattern: /high\s*fever.*stiff\s*neck|neck.*stiff.*fever/i, condition: "Possible Meningitis", severity: "emergency" },
  { pattern: /severe\s*headache.*worst\s*ever|thunderclap\s*headache/i, condition: "Possible Brain Hemorrhage", severity: "emergency" },
  { pattern: /confusion.*sudden|memory\s*loss.*sudden/i, condition: "Sudden Confusion", severity: "urgent" },
  { pattern: /vision\s*loss.*sudden|sudden\s*blind/i, condition: "Sudden Vision Loss", severity: "urgent" },
  { pattern: /numbness.*one\s*side|weakness.*one\s*side/i, condition: "Possible Stroke", severity: "urgent" },
  { pattern: /cough.*blood|bloody\s*sputum/i, condition: "Hemoptysis", severity: "urgent" },
  { pattern: /vomit.*blood|black.*stool|blood.*stool/i, condition: "GI Bleeding", severity: "urgent" },
];

export const RED_FLAG_SYMPTOMS = [
  "chest pain",
  "difficulty breathing",
  "severe bleeding",
  "loss of consciousness",
  "confusion",
  "seizures",
  "sudden weakness",
  "vision changes",
  "high fever",
  "persistent vomiting",
];

export const URGENT_KEYWORDS = [
  "severe pain",
  "worsening condition",
  "not improving",
  "getting worse",
  "spreading infection",
  "yellow skin",
  "dark urine",
  "swollen legs",
  "rapid heartbeat",
  "fainting",
];

export class MedicalSafetyService {
  constructor() {
    this.maxConfidenceThreshold = 0.85;
    this.minConfidenceThreshold = 0.3;
  }

  detectEmergency(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    for (const emergency of EMERGENCY_KEYWORDS) {
      if (emergency.pattern.test(lowerMessage)) {
        return {
          isEmergency: true,
          severity: emergency.severity,
          condition: emergency.condition,
          action: this.getEmergencyAction(emergency.condition),
          immediateAdvice: this.getImmediateAdvice(emergency.condition),
          callEmergency: this.getEmergencyNumber(emergency.condition)
        };
      }
    }

    return null;
  }

  getEmergencyAction(condition) {
    const actions = {
      "Possible Heart Attack": "Call emergency services immediately. Sit upright, loosen clothing. If prescribed, take aspirin.",
      "Respiratory Emergency": "Call emergency services. Sit upright, try to stay calm. If available, use supplemental oxygen.",
      "Unconsciousness": "Check breathing. If not breathing, start CPR. Call emergency services.",
      "Seizure": "Do not restrain. Clear area. Time the seizure. Place on side if convulsing stops.",
      "Severe Bleeding": "Apply direct pressure. Call emergency services. Do not remove embedded objects.",
      "Choking": "Perform Heimlich maneuver. Call emergency services if unsuccessful.",
      "Drug Overdose": "Call poison control and emergency services immediately.",
      "Mental Health Crisis": "Contact suicide helpline: 988 (US) or local equivalent. Stay with them.",
      "Stroke Warning Signs": "Remember FAST: Face, Arms, Speech, Time. Call emergency services immediately.",
      "Anaphylaxis": "Use epinephrine auto-injector if available. Call emergency services.",
      "Possible Meningitis": "Seek immediate medical attention. Do not delay.",
      "Possible Brain Hemorrhage": "Call emergency services. Do not give anything by mouth.",
      "Sudden Confusion": "Seek medical attention. Monitor vital signs.",
      "Sudden Vision Loss": "Seek immediate ophthalmologic care.",
      "Possible Stroke": "Call emergency services immediately. Note time of symptom onset.",
      "Hemoptysis": "Seek medical attention. Do not swallow blood.",
      "GI Bleeding": "Seek immediate medical attention. Do not ignore."
    };

    return actions[condition] || "Seek immediate medical attention.";
  }

  getImmediateAdvice(condition) {
    return `IMPORTANT: ${condition} suspected. Please:\n` +
           "1. Call emergency services or go to nearest ER\n" +
           "2. Do not delay treatment\n" +
           "3. If you have relevant medications, keep them ready\n" +
           "4. Stay as calm as possible";
  }

  getEmergencyNumber(condition) {
    return {
      india: "108 (Emergency) / 102 (Ambulance)",
      us: "911",
      uk: "999",
      generic: "112"
    };
  }

  detectRedFlags(symptoms) {
    const detectedRedFlags = [];
    
    symptoms.forEach(symptom => {
      const lowerSymptom = symptom.toLowerCase();
      
      RED_FLAG_SYMPTOMS.forEach(redFlag => {
        if (lowerSymptom.includes(redFlag.toLowerCase())) {
          detectedRedFlags.push({
            symptom: redFlag,
            matchedSymptom: symptom,
            priority: "high",
            warning: this.getRedFlagWarning(redFlag)
          });
        }
      });
    });

    return detectedRedFlags;
  }

  getRedFlagWarning(symptom) {
    const warnings = {
      "chest pain": "Chest pain can indicate heart conditions. Immediate evaluation recommended.",
      "difficulty breathing": "Respiratory distress requires urgent evaluation.",
      "severe bleeding": "Active bleeding requires immediate intervention.",
      "loss of consciousness": "Syncope requires cardiovascular evaluation.",
      "confusion": "Altered mental status needs urgent neurological assessment.",
      "seizures": "New-onset seizures require full neurological workup.",
      "sudden weakness": "Sudden weakness may indicate stroke or neurological emergency.",
      "vision changes": "Acute vision changes need immediate ophthalmological evaluation.",
      "high fever": "High fever with other symptoms may indicate serious infection.",
      "persistent vomiting": "Persistent vomiting can lead to dehydration and requires evaluation."
    };

    return warnings[symptom] || "This symptom requires medical evaluation.";
  }

  calculateConfidence(analysis) {
    let confidence = 0.7;

    if (analysis.symptoms.length >= 5) {
      confidence += 0.1;
    } else if (analysis.symptoms.length >= 3) {
      confidence += 0.05;
    }

    if (analysis.diagnosis.length > 0) {
      confidence += 0.05;
    }

    if (analysis.matchedConditions.length > 0) {
      confidence += 0.05;
    }

    if (analysis.hasRedFlags) {
      confidence -= 0.15;
    }

    if (analysis.vagueSymptoms) {
      confidence -= 0.2;
    }

    return Math.max(this.minConfidenceThreshold, Math.min(this.maxConfidenceThreshold, confidence));
  }

  getConfidenceLabel(confidence) {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Moderate";
    if (confidence >= 0.4) return "Low";
    return "Very Low";
  }

  generateDisclaimer() {
    return "⚠️ MEDICAL DISCLAIMER: This AI assistant provides general health information, not professional medical advice. " +
           "Always consult a qualified healthcare provider for diagnosis and treatment. " +
           "In case of emergency, call your local emergency services immediately.";
  }

  shouldSeekProfessional(symptoms, confidence) {
    const urgentSymptomCount = symptoms.filter(s => 
      URGENT_KEYWORDS.some(keyword => s.toLowerCase().includes(keyword.toLowerCase()))
    ).length;

    return confidence < 0.6 || urgentSymptomCount > 0 || symptoms.length > 10;
  }
}

export const medicalSafety = new MedicalSafetyService();
