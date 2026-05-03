import express from "express";
import {
  chatWithAI,
  getChatHistory
} from "../controllers/chat.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { chatLimiter } from "../middleware/rateLimit.middleware.js";
import { validateSymptomInput, validateMedicalInput } from "../middleware/security.middleware.js";

const router = express.Router();

router.post(
  "/symptoms",
  authMiddleware,
  chatLimiter,
  validateSymptomInput,
  validateMedicalInput,
  chatWithAI
);

router.get("/history", authMiddleware, getChatHistory);

export default router;
