import { Router } from "express";
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
} from "../controllers/templates.controller";

const router = Router();

router.get("/", getTemplates);
router.get("/:id", getTemplate);
router.post("/", createTemplate);
router.patch("/:id", updateTemplate);

export default router;

