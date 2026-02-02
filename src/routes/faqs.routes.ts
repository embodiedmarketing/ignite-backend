import { Router } from "express";
import {
  getAllFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
} from "../controllers/faqs.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// All routes require authentication
router.use(isAuthenticated);

router.get("/", getAllFaqs);
router.post("/", createFaq);
router.put("/:id", updateFaq);
router.delete("/:id", deleteFaq);

export default router;

