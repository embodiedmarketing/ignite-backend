import { Router } from "express";
import {
  getAllOnboardingSteps,
  createOnboardingStep,
  updateOnboardingStep,
  deleteOnboardingStep,
} from "../controllers/onboarding-steps.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// All routes require authentication
router.use(isAuthenticated);

router.get("/", getAllOnboardingSteps);
router.post("/", createOnboardingStep);
router.put("/:id", updateOnboardingStep);
router.delete("/:id", deleteOnboardingStep);

export default router;

