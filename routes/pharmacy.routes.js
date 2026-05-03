import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  getNearbyPharmacies,
  getPharmacyDetails,
  sendMedicineRequest,
  getMyRequests,
  deleteRequest,
} from "../controllers/pharmacy.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/nearby", getNearbyPharmacies);
router.get("/details/:placeId", getPharmacyDetails);
router.post("/request", sendMedicineRequest);
router.get("/requests", getMyRequests);
router.delete("/requests/:id", deleteRequest);

export default router;
