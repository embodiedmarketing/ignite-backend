import { Router } from "express";
import {
  getOrientationVideo,
  createOrientationVideo,
  updateOrientationVideo,
  deleteOrientationVideo,
} from "../controllers/orientation-video.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { isAdmin } from "../middlewares/admin.middleware";

const router = Router();

// GET endpoint is public (no auth required)
router.get("/", getOrientationVideo);

// POST, PUT, DELETE endpoints require authentication and admin role
router.post("/", isAuthenticated, isAdmin, createOrientationVideo);
router.put("/:id", isAuthenticated, isAdmin, updateOrientationVideo);
router.delete("/:id", isAuthenticated, isAdmin, deleteOrientationVideo);

export default router;

