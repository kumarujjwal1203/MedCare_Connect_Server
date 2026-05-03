import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import { askGPT } from "./gpt.service.js";

const createGeminiClient = () => {
  const apiKey = env.geminiApiKey;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing in .env");
  }

  return new GoogleGenerativeAI(apiKey, {
    apiVersion: "v1",
  });
};

// Try models in order of preference; falls back on retired/quota-limited models.
const MODEL_CANDIDATES = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-pro",
];

const cleanText = (text) =>
  text
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, "").trim())
    .replace(/[*_`>#]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const askGemini = async (prompt) => {
  let genAI;
  try {
    genAI = createGeminiClient();
  } catch (error) {
    return askGPTText(prompt, error);
  }

  let lastError;

  for (const modelName of MODEL_CANDIDATES) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response?.text();
      if (!text) throw new Error("Empty response from Gemini");
      return cleanText(text);
    } catch (error) {
      if (isRetryableProviderError(error)) {
        console.warn(`Model "${modelName}" unavailable: ${error.message.slice(0, 80)}`);
        lastError = error;
        continue;
      }
      // Any other error — surface immediately
      console.error("Gemini Error:", error.message);
      return askGPTText(prompt, error);
    }
  }

  console.error("All Gemini models exhausted:", lastError?.message);
  return askGPTText(prompt, lastError);
};

const isRetryableProviderError = (error) => {
  const message = error?.message || "";
  const status = error?.status || error?.response?.status;

  return (
    [404, 429, 500, 502, 503, 504].includes(status) ||
    /404|429|500|502|503|504|not found|quota|overloaded|unavailable|retired|deprecated/i.test(message)
  );
};

const askGPTText = async (prompt, cause) => {
  try {
    const response = await askGPT(
      `${prompt}\n\nReturn a concise patient-friendly medical guidance response as plain text, not JSON.`
    );

    try {
      const parsed = JSON.parse(response);
      return cleanText(
        parsed.response ||
          parsed.answer ||
          parsed.message ||
          parsed.guidance ||
          Object.values(parsed).filter((value) => typeof value === "string").join("\n")
      );
    } catch {
      return cleanText(response);
    }
  } catch (openAiError) {
    throw new Error(
      `AI providers unavailable. Gemini: ${cause?.message || "not configured"}; OpenAI: ${openAiError.message}`
    );
  }
};
