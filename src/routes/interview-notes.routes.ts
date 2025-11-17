import { Router } from "express";
import {
  getInterviewNotes,
  upsertInterviewNote,
  getInterviewNoteHistory,
  restoreInterviewNote,
  bulkSaveInterviewNotes,
} from "../controllers/interview-notes.controller";

const router = Router();

router.get("/:userId", getInterviewNotes);
router.post("/", upsertInterviewNote);
router.get("/:userId/:noteKey/history", getInterviewNoteHistory);
router.post("/restore", restoreInterviewNote);
router.post("/bulk", bulkSaveInterviewNotes);

export default router;




