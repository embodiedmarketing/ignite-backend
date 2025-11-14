import { Router } from "express";
import {
  getActiveAccountabilityThread,
  getParticipationStatus,
  markParticipated,
} from "../controllers/forum.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// Accountability routes (separate from forum routes for correct path registration)
router.get("/active-thread", getActiveAccountabilityThread);
router.get("/participation-status", isAuthenticated, getParticipationStatus);
router.post("/mark-participated", isAuthenticated, markParticipated);

export default router;

