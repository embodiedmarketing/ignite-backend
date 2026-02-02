import { Router } from "express";
import {
  getAllTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from "../controllers/team-members.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

router.use(isAuthenticated);

router.get("/", getAllTeamMembers);
router.post("/", createTeamMember);
router.put("/:id", updateTeamMember);
router.delete("/:id", deleteTeamMember);

export default router;

