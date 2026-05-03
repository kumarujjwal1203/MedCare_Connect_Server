const replacementRules = [
  [/bukhar/gi, "fever"],
  [/khansi/gi, "cough"],
  [/sardi|sardi zukam|jukham|zukam/gi, "cold"],
  [/sar dard|sir dard/gi, "headache"],
  [/pet dard|stomach me pain|pet mein dard/gi, "stomach pain"],
  [/chaati dard|chati dard|seene me dard|chest me pain/gi, "chest pain"],
  [/kaan dard|ear pian|ear pn|ear ache/gi, "ear pain"],
  [/aankh dard|aankh me pain/gi, "eye pain"],
  [/saans lene me dikkat|sans lene me dikkat|breathing issue|saans ki dikkat/gi, "breathing trouble"],
  [/ulti/gi, "vomiting"],
  [/dast|loose motion/gi, "diarrhea"],
  [/ghabrahat/gi, "anxiety"],
  [/tension|stressfull|stressed/gi, "stress"],
  [/udasi|bahut udaas/gi, "depression"],
  [/behosh|hosh nahi/gi, "unconscious"],
  [/bleading/gi, "bleeding"],
  [/fractur|fracter/gi, "fracture"],
  [/pian/gi, "pain"],
  [/bp high|high bp/gi, "high blood pressure"],
  [/bp low|low bp/gi, "low blood pressure"]
];

const cleanup = (text) =>
  text
    .replace(/[^a-zA-Z0-9\s.,%-]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

export const normalizeUserInput = (message = "") => {
  let normalized = String(message || "");

  for (const [pattern, replacement] of replacementRules) {
    normalized = normalized.replace(pattern, replacement);
  }

  return cleanup(normalized);
};

export const detectDuration = (message = "") => {
  const text = message.toLowerCase();
  const matchers = [
    { regex: /(\d+)\s*(day|days|din)/, multiplier: 1 },
    { regex: /(\d+)\s*(week|weeks|hafta|hafte)/, multiplier: 7 },
    { regex: /(\d+)\s*(month|months|mahina|mahine)/, multiplier: 30 }
  ];

  for (const item of matchers) {
    const match = text.match(item.regex);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) {
        return {
          raw: match[0],
          days: value * item.multiplier
        };
      }
    }
  }

  return null;
};
