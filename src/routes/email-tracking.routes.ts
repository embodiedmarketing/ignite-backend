import { Router } from "express";
import {
  getEmailTrackingByUser,
  getEmailTrackingByDate,
  createEmailTracking,
  updateEmailTracking,
  deleteEmailTracking,
} from "../controllers/email-tracking.controller";

const router = Router();

router.get("/user/:userId", getEmailTrackingByUser);
router.get("/user/:userId/date/:date", getEmailTrackingByDate);
router.post("/", createEmailTracking);
router.patch("/:id", updateEmailTracking);
router.delete("/:id", deleteEmailTracking);

export default router;

