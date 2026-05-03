import dotenv from "dotenv";

dotenv.config({ quiet: true });

const getEnv = (key, fallback = "") => {
  const value = process.env[key];

  if (typeof value !== "string") {
    return fallback;
  }

  return value.trim();
};

const jwtSecret = getEnv("JWT_SECRET");
const jwtRefreshSecret = getEnv("JWT_REFRESH_SECRET");
const fallbackJwtSecret = "dev-only-secret-change-me";
const fallbackJwtRefreshSecret = "dev-only-refresh-secret-change-me";

if (!jwtSecret) {
  console.warn(
    "JWT_SECRET is not configured. Falling back to a development-only secret."
  );
}

if (!jwtRefreshSecret) {
  console.warn(
    "JWT_REFRESH_SECRET is not configured. Falling back to a development-only refresh secret."
  );
}

const defaultClientUrls = [
  "http://localhost:3000",
  "http://localhost:4173",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:5173",
  "https://med-care-connect-client.vercel.app"
];

const configuredClientUrls = getEnv("CLIENT_URLS")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  nodeEnv: getEnv("NODE_ENV", "development"),
  port: Number(getEnv("PORT", "5000")) || 5000,
  mongoUri: getEnv("MONGO_URI"),
  jwtSecret: jwtSecret || fallbackJwtSecret,
  jwtRefreshSecret: jwtRefreshSecret || fallbackJwtRefreshSecret,
  clientUrls:
    configuredClientUrls.length > 0 ? configuredClientUrls : defaultClientUrls,
  geminiApiKey: getEnv("GEMINI_API_KEY"),
  openAiApiKey: getEnv("OPENAI_KEY"),
  huggingFaceApiKey: getEnv("HUGGING_FACE_API_KEY"),
  bioMistralModel: getEnv("BIOMISTRAL_MODEL", "BioMistral/BioMistral-7B"),
  uploadDir: getEnv("UPLOAD_DIR", "uploads"),
  maxFileSize: Number(getEnv("MAX_FILE_SIZE", `${5 * 1024 * 1024}`)) || 5 * 1024 * 1024
};

export const hasAiProviderConfig = Boolean(
  env.geminiApiKey || env.openAiApiKey
);
