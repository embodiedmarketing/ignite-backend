import { Router } from "express";
import {
  getContentStrategyPreferences,
  getContentStrategyPreferencesByUserId,
  saveContentStrategyPreferences,
  getGeneratedContentStrategies,
  getActiveContentStrategy,
  getActiveContentStrategyByUserId,
} from "../controllers/content-strategy.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

router.get("/preferences", isAuthenticated, getContentStrategyPreferences);
router.get("/preferences/:userId", getContentStrategyPreferencesByUserId); // Legacy route
router.post("/save-preferences", isAuthenticated, saveContentStrategyPreferences);
router.get("/generated/:userId", getGeneratedContentStrategies);
router.get("/active", isAuthenticated, getActiveContentStrategy);
router.get("/active/:userId", getActiveContentStrategyByUserId); // Legacy route

export default router;

