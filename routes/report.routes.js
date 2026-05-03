import express from "express";
import {
  uploadReport,
  getReports,
  getReportById,
  deleteReport
} from "../controllers/report.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";
import { uploadLimiter } from "../middleware/rateLimit.middleware.js";
import { validateFileUpload } from "../middleware/security.middleware.js";

const router = express.Router();

router.post(
  "/upload",
  authMiddleware,
  uploadLimiter,
  upload.single("file"),
  validateFileUpload,
  uploadReport
);

router.get("/", authMiddleware, getReports);

router.get("/:id", authMiddleware, getReportById);

router.delete("/:id", authMiddleware, deleteReport);

export default router;
