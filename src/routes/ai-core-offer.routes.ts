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
} from "../controllers/ai-core-offer.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

router.post("/coach/:questionKey", isAuthenticated, coachCoreOfferQuestion);
router.post("/rewrite/:questionKey", isAuthenticated, rewriteCoreOfferQuestion);
router.post(
  "/accept-rewrite/:questionKey",
  isAuthenticated,
  acceptCoreOfferRewrite
);
router.post("/summary", isAuthenticated, getCoreOfferSummary);
router.get("/coaching-sessions", isAuthenticated, getCoreOfferCoachingSessions);
router.post("/evaluate-section", isAuthenticated, evaluateCoreOfferSection);
router.post("/rewrite-section", isAuthenticated, rewriteCoreOfferSection);
router.post("/tripwire-templates", isAuthenticated, generateTripwireTemplates);

export default router;




