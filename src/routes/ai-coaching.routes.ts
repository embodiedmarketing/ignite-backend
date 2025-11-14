import { Router } from "express";
import {
  getInteractiveCoachingRoute,
  getIntelligentPrefill,
  expandResponseWithCoaching,
  getRealTimeFeedbackRoute,
} from "../controllers/ai-coaching.controller";

const router = Router();

router.post("/interactive-coaching", getInteractiveCoachingRoute);
router.post("/intelligent-prefill", getIntelligentPrefill);
router.post("/expand-response-with-coaching", expandResponseWithCoaching);
router.post("/real-time-feedback", getRealTimeFeedbackRoute);

export default router;
