import { Router } from "express";
import {
  getActivitiesByUser,
  createActivity,
} from "../controllers/activities.controller";

const router = Router();

router.get("/user/:userId", getActivitiesByUser);
router.post("/", createActivity);

export default router;

