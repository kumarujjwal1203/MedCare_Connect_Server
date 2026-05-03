import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "./env.js";

export const getGeminiModel = () => {
  if (!env.geminiApiKey) {
    return null;
  }

  const genAI = new GoogleGenerativeAI(env.geminiApiKey);

  return genAI.getGenerativeModel({
    model: "gemini-1.5-flash"
  });
};
