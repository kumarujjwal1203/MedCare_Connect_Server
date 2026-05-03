import express from "express";
import {
  createReminder,
  getReminders,
  getReminderById,
  updateReminder,
  deleteReminder,
  markComplete
} from "../controllers/reminder.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authMiddleware, createReminder);

router.get("/", authMiddleware, getReminders);

router.get("/:id", authMiddleware, getReminderById);

router.put("/:id", authMiddleware, updateReminder);

router.patch("/:id/complete", authMiddleware, markComplete);

router.delete("/:id", authMiddleware, deleteReminder);

export default router;
