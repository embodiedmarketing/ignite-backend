import { Router } from "express";
import {
  getAllStepContent,
  getStepContent,
  createStepContent,
  updateStepContent,
} from "../controllers/step-content.controller";

const router = Router();

router.get("/", getAllStepContent);
router.get("/:stepNumber", getStepContent);
router.post("/", createStepContent);
router.patch("/:id", updateStepContent);

export default router;

