import { Router } from "express";
import {
  getAllJourneySteps,
  createJourneyStep,
  updateJourneyStep,
  deleteJourneyStep,
} from "../controllers/journey-steps.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { isAdmin } from "../middlewares/admin.middleware";

const router = Router();

// GET endpoint is public (no auth required)
router.get("/", getAllJourneySteps);

// POST, PUT, DELETE endpoints require authentication and admin role
router.post("/", isAuthenticated, isAdmin, createJourneyStep);
router.put("/:id", isAuthenticated, isAdmin, updateJourneyStep);
router.delete("/:id", isAuthenticated, isAdmin, deleteJourneyStep);

export default router;

