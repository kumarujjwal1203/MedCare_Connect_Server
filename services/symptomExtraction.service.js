import axios from "axios";
import { env } from "../config/env.js";

const HF_MODEL_URL =
  "https://api-inference.huggingface.co/models/dslim/bert-base-NER";

const symptomLexicon = [
  "fever",
  "cold",
  "covid",
  "cough",
  "dry cough",
  "chest pain",
  "stomach pain",
  "headache",
  "migraine",
  "fracture",
  "broken bone",
  "wound",
  "bleeding",
  "burn",
  "asthma",
  "bp",
  "blood pressure",
  "diabetes",
  "dizziness",
  "fatigue",
  "sore throat",
  "breathing trouble",
  "shortness of breath",
  "vomiting",
  "diarrhea",
  "rash"
];

const dedupe = (items) => [...new Set(items.filter(Boolean))];

const normalizeText = (text) => text.toLowerCase().replace(/[^a-z\s]/g, " ");

const extractFromLexicon = (message) => {
  const normalized = normalizeText(message);

  return symptomLexicon.filter((symptom) => normalized.includes(symptom));
};

const mergeWordPieces = (items = []) => {
  const merged = [];

  for (const item of items) {
    const word = item?.word?.replace(/^##/, "")?.trim();

    if (!word) {
      continue;
    }

    if (item.word?.startsWith("##") && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]}${word}`;
      continue;
    }

    merged.push(word);
  }

  return merged;
};

const extractFromHuggingFace = async (message) => {
  if (!env.huggingFaceApiKey) {
    return [];
  }

  try {
    const response = await axios.post(
      HF_MODEL_URL,
      { inputs: message, options: { wait_for_model: true } },
      {
        headers: {
          Authorization: `Bearer ${env.huggingFaceApiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    const rawItems = Array.isArray(response.data) ? response.data.flat() : [];
    const mergedWords = mergeWordPieces(rawItems);
    const normalized = normalizeText(mergedWords.join(" "));

    return symptomLexicon.filter((symptom) => normalized.includes(symptom));
  } catch (error) {
    console.warn("Hugging Face symptom extraction failed:", error.message);
    return [];
  }
};

export const extractSymptoms = async (message) => {
  const localSymptoms = extractFromLexicon(message);
  const hfSymptoms = await extractFromHuggingFace(message);

  if (localSymptoms.length || hfSymptoms.length) {
    return dedupe([...localSymptoms, ...hfSymptoms]);
  }

  const normalized = normalizeText(message)
    .split(/\s+/)
    .filter((word) => word.length > 2);

  return dedupe(normalized.slice(0, 3));
};
