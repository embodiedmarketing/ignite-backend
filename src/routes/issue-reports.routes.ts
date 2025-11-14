import { Router } from "express";
import {
  getAllIssueReports,
  createIssueReport,
  updateIssueReport,
  deleteIssueReport,
} from "../controllers/issue-reports.controller";

const router = Router();

router.get("/", getAllIssueReports);
router.post("/", createIssueReport);
router.patch("/:id", updateIssueReport);
router.delete("/:id", deleteIssueReport);

export default router;

