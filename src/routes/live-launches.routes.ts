import { Router } from "express";
import {
  getLiveLaunchesByUser,
  getLiveLaunch,
  createLiveLaunch,
  updateLiveLaunch,
  deleteLiveLaunch,
  getFunnelMetrics,
  upsertFunnelMetric,
  getOrganicMetrics,
  upsertOrganicMetric,
  getEmailTrackingByLaunch,
  getOptimizationSuggestions,
  createOptimizationSuggestions,
} from "../controllers/live-launches.controller";

const router = Router();

router.get("/user/:userId", getLiveLaunchesByUser);
router.get("/:id", getLiveLaunch);
router.post("/", createLiveLaunch);
router.patch("/:id", updateLiveLaunch);
router.delete("/:id", deleteLiveLaunch);
router.get("/:liveLaunchId/funnel-metrics", getFunnelMetrics);
router.post("/:liveLaunchId/funnel-metrics", upsertFunnelMetric);
router.get("/:liveLaunchId/organic-metrics", getOrganicMetrics);
router.post("/:liveLaunchId/organic-metrics", upsertOrganicMetric);
router.get("/:liveLaunchId/email-tracking", getEmailTrackingByLaunch);
router.get("/:liveLaunchId/optimization-suggestions", getOptimizationSuggestions);
router.post("/:liveLaunchId/optimization-suggestions", createOptimizationSuggestions);

export default router;

