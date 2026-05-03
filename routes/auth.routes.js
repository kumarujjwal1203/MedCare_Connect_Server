import express from "express";
import {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  googleAuthorize,
  googleCallback,
  googleOAuth,
  getProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  authLimiter,
  googleAuthLimiter,
} from "../middleware/rateLimit.middleware.js";
import {
  sanitizeInput,
  validateMedicalInput,
} from "../middleware/security.middleware.js";

const router = express.Router();

router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.post("/refresh", authLimiter, refreshToken);
router.post("/logout", authLimiter, logoutUser);
router.get("/google/authorize", googleAuthLimiter, googleAuthorize);
router.get("/google/callback", googleAuthLimiter, googleCallback);
router.post("/google", googleAuthLimiter, googleOAuth);

router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password/:token", authLimiter, resetPassword);

router.get("/me", authMiddleware, getProfile);
router.put(
  "/me",
  authMiddleware,
  sanitizeInput,
  validateMedicalInput,
  updateProfile,
);

export default router;
