import axios from "axios";
import { env } from "../config/env.js";

const sanitize = (text) =>
  String(text || "")
    .replace(/```json|```/gi, "")
    .trim();

export const askBioMistral = async (prompt) => {
  if (!env.huggingFaceApiKey) {
    throw new Error("Hugging Face provider is not configured");
  }

  try {
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${env.bioMistralModel}`,
      {
        inputs: prompt,
        parameters: {
          temperature: 0.8,
          max_new_tokens: 320,
          return_full_text: false
        },
        options: {
          wait_for_model: true,
          use_cache: false
        }
      },
      {
        headers: {
          Authorization: `Bearer ${env.huggingFaceApiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    const payload = response.data;

    if (Array.isArray(payload) && payload[0]?.generated_text) {
      return sanitize(payload[0].generated_text);
    }

    if (payload?.generated_text) {
      return sanitize(payload.generated_text);
    }

    throw new Error("Empty response received from BioMistral");
  } catch (error) {
    throw new Error(
      `BioMistral API failed: ${error.response?.data?.error || error.message}`
    );
  }
};
