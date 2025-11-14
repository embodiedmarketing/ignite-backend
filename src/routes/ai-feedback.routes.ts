import { Router } from "express";
import {
  analyzeUserResponse,
  getImprovementSuggestions,
  cleanupTranscript,
  expandResponse,
  addPodcastInsightsRoute,
} from "../controllers/ai-feedback.controller";

const router = Router();

router.post("/analyze-response", analyzeUserResponse);
router.post("/improvement-suggestions", getImprovementSuggestions);
router.post("/cleanup-transcript", cleanupTranscript);
router.post("/expand-response", expandResponse);
router.post("/add-podcast-insights", addPodcastInsightsRoute);

export default router;
