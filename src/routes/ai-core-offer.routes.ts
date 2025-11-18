import { Router } from "express";
import {
  coachCoreOfferQuestion,
  rewriteCoreOfferQuestion,
  acceptCoreOfferRewrite,
  getCoreOfferSummary,
  getCoreOfferCoachingSessions,
  evaluateCoreOfferSection,
  rewriteCoreOfferSection,
  generateTripwireTemplates,
  generateCoreOfferOutline,
  generateTripwireOutline,
} from "../controllers/ai-core-offer.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// Register specific routes BEFORE parameterized routes to avoid conflicts
router.post(
  "/generate-tripwire-outline",
  isAuthenticated,
  generateTripwireOutline
);
router.post(
  "/generate-core-offer-outline",
  isAuthenticated,
  generateCoreOfferOutline
);
router.post("/summary", isAuthenticated, getCoreOfferSummary);
router.get("/coaching-sessions", isAuthenticated, getCoreOfferCoachingSessions);
router.post("/evaluate-section", isAuthenticated, evaluateCoreOfferSection);
router.post("/rewrite-section", isAuthenticated, rewriteCoreOfferSection);
router.post("/tripwire-templates", isAuthenticated, generateTripwireTemplates);

// Parameterized routes (should come after specific routes)
router.post("/coach/:questionKey", isAuthenticated, coachCoreOfferQuestion);
router.post("/rewrite/:questionKey", isAuthenticated, rewriteCoreOfferQuestion);
router.post(
  "/accept-rewrite/:questionKey",
  isAuthenticated,
  acceptCoreOfferRewrite
);

export default router;
