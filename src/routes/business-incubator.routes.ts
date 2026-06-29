import { Router } from "express";
import {
  getCustomerJourneyVideos,
  createCustomerJourneyVideo,
  updateCustomerJourneyVideo,
  deleteCustomerJourneyVideo,
  getMessagingVideos,
  createMessagingVideo,
  updateMessagingVideo,
  deleteMessagingVideo,
} from "../controllers/business-incubator.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { isAdmin } from "../middlewares/admin.middleware";

const router = Router();

router.use(isAuthenticated);

router.get("/customer-journey-videos", getCustomerJourneyVideos);
router.post("/customer-journey-videos", isAdmin, createCustomerJourneyVideo);
router.put("/customer-journey-videos/:id", isAdmin, updateCustomerJourneyVideo);
router.delete(
  "/customer-journey-videos/:id",
  isAdmin,
  deleteCustomerJourneyVideo
);

router.get("/messaging-videos", getMessagingVideos);
router.post("/messaging-videos", isAdmin, createMessagingVideo);
router.put("/messaging-videos/:id", isAdmin, updateMessagingVideo);
router.delete("/messaging-videos/:id", isAdmin, deleteMessagingVideo);

export default router;
