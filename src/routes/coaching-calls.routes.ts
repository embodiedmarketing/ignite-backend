import { Router } from "express";
import {
  getCoachingCallRecordings,
  getCoachingCallRecording,
  createCoachingCallRecording,
  updateCoachingCallRecording,
  deleteCoachingCallRecording,
} from "../controllers/coaching-calls.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// All routes require authentication
router.use(isAuthenticated);

// POST /api/coaching-calls/recordings - Create a new recording
router.post("/recordings", createCoachingCallRecording);

// GET /api/coaching-calls/recordings - Get all recordings
router.get("/recordings", getCoachingCallRecordings);

// GET /api/coaching-calls/recordings/:id - Get a specific recording
router.get("/recordings/:id", getCoachingCallRecording);

// PUT /api/coaching-calls/recordings/:id - Update a recording
router.put("/recordings/:id", updateCoachingCallRecording);

// DELETE /api/coaching-calls/recordings/:id - Delete a recording
router.delete("/recordings/:id", deleteCoachingCallRecording);

export default router;

