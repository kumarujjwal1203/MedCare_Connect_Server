import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";
import {
  getCurrentUser,
  updateProfile,
  uploadProfilePhoto,
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/me", authMiddleware, getCurrentUser);
router.put("/update", authMiddleware, updateProfile);
router.post(
  "/upload-photo",
  authMiddleware,
  upload.single("photo"),
  uploadProfilePhoto,
);

export default router;
