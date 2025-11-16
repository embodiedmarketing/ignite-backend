import { Router } from "express";
import {
  getChecklistItems,
  upsertChecklistItem,
} from "../controllers/checklist-items.controller";

const router = Router();

router.get("/:userId/:sectionKey", getChecklistItems);
router.post("/", upsertChecklistItem);

export default router;
