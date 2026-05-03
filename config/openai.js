import OpenAI from "openai";
import { env } from "./env.js";

const openai = env.openAiApiKey
  ? new OpenAI({
      apiKey: env.openAiApiKey
    })
  : null;

export default openai;
