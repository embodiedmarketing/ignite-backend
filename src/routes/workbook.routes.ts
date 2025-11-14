import { Router } from "express";
import {
  getWorkbookResponsesByUser,
  getWorkbookResponsesByStep,
  getWorkbookResponse,
  upsertWorkbookResponse,
  deleteWorkbookResponse,
} from "../controllers/workbook.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

router.get("/user/:userId", getWorkbookResponsesByUser);
router.get("/user/:userId/step/:stepNumber", getWorkbookResponsesByStep);
router.get(
  "/user/:userId/step/:stepNumber/question/:questionKey",
  getWorkbookResponse
);
router.post("/", upsertWorkbookResponse);
router.delete(
  "/user/:userId/step/:stepNumber/question/:questionKey",
  deleteWorkbookResponse
);

export default router;


