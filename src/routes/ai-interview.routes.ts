import { Router } from "express";
import {
  parseInterviewTranscript,
  synthesizeInterviewResponse,
  synthesizeInterviewsToStrategy,
  intelligentInterviewProcessing,
  transferInterviewResponse,
  uploadTranscript,
  getTranscriptNotes,
} from "../controllers/ai-interview.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

router.post("/parse-transcript", isAuthenticated, parseInterviewTranscript);
router.post(
  "/synthesize-interview-response",
  isAuthenticated,
  synthesizeInterviewResponse
);
router.post(
  "/synthesize-interviews-to-strategy",
  isAuthenticated,
  synthesizeInterviewsToStrategy
);

// Intelligent interview processing - processes transcript and saves to workbook responses
// Route: POST /api/interview/intelligent-interview-processing
router.post(
  "/intelligent-interview-processing",
  isAuthenticated,
  intelligentInterviewProcessing
);

// Get interview notes for a specific transcript by ID
// Route: GET /api/interview/transcript/:id/notes
// Alternative: GET /api/interview/transcript-notes?id=123
router.get("/transcript/:id/notes", isAuthenticated, getTranscriptNotes);
router.get("/transcript-notes", isAuthenticated, getTranscriptNotes);

router.post(
  "/transfer-interview-response",
  isAuthenticated,
  transferInterviewResponse
);
router.post(
  "/upload-transcript",
  upload.single("transcript"),
  uploadTranscript
);

export default router;
