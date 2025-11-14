import { Router } from "express";
import {
  getUserMetrics,
  getHealthAlerts,
  trackUserActivity,
} from "../controllers/user-monitoring.controller";

const router = Router();

router.get("/metrics", getUserMetrics);
router.get("/alerts", getHealthAlerts);
router.post("/track", trackUserActivity);

export default router;



