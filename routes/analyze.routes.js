import express from "express";
import { analyzeSymptoms } from "../controllers/analyze.controller.js";

const router = express.Router();

router.post("/analyze", analyzeSymptoms);

export default router;
