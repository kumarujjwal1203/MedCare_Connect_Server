import express from "express";
import {
  getHealthTimeline,
  getAIMemory,
  getRiskScore,
  clearAIMemory
} from "../controllers/health.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/timeline", authMiddleware, getHealthTimeline);

router.get("/memory", authMiddleware, getAIMemory);

router.get("/risk-score", authMiddleware, getRiskScore);

router.delete("/memory", authMiddleware, clearAIMemory);

export default router;
