import { Router } from "express";
import {
  getCoachingCallRecordings,
  getCoachingCallRecording,
  createCoachingCallRecording,
  updateCoachingCallRecording,
  deleteCoachingCallRecording,
  getCoachingCallsSchedule,
  createCoachingCallSchedule,
  updateCoachingCallSchedule,
  deleteCoachingCallSchedule,
} from "../controllers/coaching-calls.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { isAdmin } from "../middlewares/admin.middleware";

const router = Router();

// All routes require authentication
router.use(isAuthenticated);

// ============================================
// Coaching Call Recordings Routes
// ============================================

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

// ============================================
// Coaching Calls Schedule Routes
// ============================================

// GET /api/coaching-calls/schedule - Get all scheduled calls (all authenticated users)
router.get("/schedule", getCoachingCallsSchedule);

// POST /api/coaching-calls/schedule - Create a new scheduled call (Admin only)
router.post("/schedule", isAdmin, createCoachingCallSchedule);

// PUT /api/coaching-calls/schedule/:id - Update a scheduled call (Admin only)
router.put("/schedule/:id", isAdmin, updateCoachingCallSchedule);

// DELETE /api/coaching-calls/schedule/:id - Delete a scheduled call (Admin only)
router.delete("/schedule/:id", isAdmin, deleteCoachingCallSchedule);

export default router;

