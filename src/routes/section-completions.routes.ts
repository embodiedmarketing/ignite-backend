import { Router } from "express";
import {
  getSectionCompletions,
  markSectionComplete,
  unmarkSectionComplete,
} from "../controllers/section-completions.controller";

const router = Router();

router.get("/user/:userId", getSectionCompletions);
router.post("/", markSectionComplete);
router.delete("/", unmarkSectionComplete);

export default router;




