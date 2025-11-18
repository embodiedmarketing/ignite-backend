import { Router } from "express";
import {
  getMessagingStrategiesByUser,
  getActiveMessagingStrategy,
  createMessagingStrategy,
  updateMessagingStrategy,
  deleteMessagingStrategy,
  setActiveMessagingStrategy,
  getActiveUserMessagingStrategy,
} from "../controllers/messaging-strategy.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// Register specific routes BEFORE parameterized routes to avoid conflicts
router.get("/active", isAuthenticated, getActiveUserMessagingStrategy);
router.get("/user/:userId", getMessagingStrategiesByUser);
router.get("/active/:userId", getActiveMessagingStrategy);
router.post("/", createMessagingStrategy);
router.put("/:id", updateMessagingStrategy);
router.delete("/:id", deleteMessagingStrategy);
router.post("/:strategyId/activate/:userId", setActiveMessagingStrategy);

export default router;
