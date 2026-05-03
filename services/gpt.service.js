import openai from "../config/openai.js";

export const askGPT = async (prompt) => {
  if (!openai) {
    throw new Error("OpenAI provider is not configured");
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a preventive healthcare AI assistant. Always return strict JSON only and never include markdown fences."
      },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });

  const content = response?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Empty response received from OpenAI");
  }

  return content;
};
