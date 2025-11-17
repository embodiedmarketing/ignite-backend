import { Router } from "express";
import {
  parseInterviewTranscript,
  synthesizeInterviewResponse,
  synthesizeInterviewsToStrategy,
  intelligentInterviewProcessing,
  transferInterviewResponse,
  uploadTranscript,
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
router.post(
  "/intelligent-processing",
  isAuthenticated,
  intelligentInterviewProcessing
);
router.post("/transfer-response", isAuthenticated, transferInterviewResponse);
router.post(
  "/upload-transcript",
  upload.single("transcript"),
  uploadTranscript
);

export default router;




