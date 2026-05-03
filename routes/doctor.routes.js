import express from "express";
import {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getSpecializations,
  recommendDoctor,
  seedDoctors
} from "../controllers/doctor.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, getDoctors);
router.get("/specializations", authMiddleware, getSpecializations);
router.get("/:id", authMiddleware, getDoctorById);
router.post("/", authMiddleware, createDoctor);
router.put("/:id", authMiddleware, updateDoctor);
router.delete("/:id", authMiddleware, deleteDoctor);
router.post("/recommend", authMiddleware, recommendDoctor);
router.post("/seed", authMiddleware, seedDoctors);

export default router;
