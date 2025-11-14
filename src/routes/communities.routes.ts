import { Router } from "express";
import {
  getCommunitiesByUser,
  createCommunity,
  updateCommunity,
} from "../controllers/communities.controller";

const router = Router();

router.get("/user/:userId", getCommunitiesByUser);
router.post("/", createCommunity);
router.patch("/:id", updateCommunity);

export default router;

