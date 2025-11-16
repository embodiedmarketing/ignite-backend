import { Router } from "express";
import {
  getMessagingStrategiesByUser,
  getActiveMessagingStrategy,
  createMessagingStrategy,
  updateMessagingStrategy,
  deleteMessagingStrategy,
  setActiveMessagingStrategy,
} from "../controllers/messaging-strategy.controller";

const router = Router();

router.get("/user/:userId", getMessagingStrategiesByUser);
router.get("/active/:userId", getActiveMessagingStrategy);
router.post("/", createMessagingStrategy);
router.put("/:id", updateMessagingStrategy);
router.delete("/:id", deleteMessagingStrategy);
router.post("/:strategyId/activate/:userId", setActiveMessagingStrategy);

export default router;
