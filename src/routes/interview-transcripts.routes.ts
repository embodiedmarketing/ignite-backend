import { Router } from "express";
import {
  getInterviewTranscriptsByUser,
  getInterviewTranscript,
  createInterviewTranscript,
  updateInterviewTranscript,
  deleteInterviewTranscript,
  resetStuckTranscripts,
} from "../controllers/interview-transcripts.controller";

const router = Router();

router.get("/user/:userId", getInterviewTranscriptsByUser);
router.get("/:id", getInterviewTranscript);
router.post("/", createInterviewTranscript);
router.put("/:id", updateInterviewTranscript);
router.delete("/:id", deleteInterviewTranscript);
router.post("/reset-stuck", resetStuckTranscripts);

export default router;



