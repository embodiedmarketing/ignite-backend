import { Router } from "express";
import {
  getConversationsByUser,
  getConversationsByOffer,
  createConversation,
  updateConversation,
} from "../controllers/conversations.controller";

const router = Router();

router.get("/user/:userId", getConversationsByUser);
router.get("/offer/:offerId", getConversationsByOffer);
router.post("/", createConversation);
router.patch("/:id", updateConversation);

export default router;

