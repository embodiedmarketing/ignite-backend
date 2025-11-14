import { Router } from "express";
import {
  getUserOfferOutlines,
  getActiveUserOfferOutline,
  createUserOfferOutline,
  updateUserOfferOutline,
  setActiveUserOfferOutline,
  deleteUserOfferOutline,
} from "../controllers/user-offer-outlines.controller";

const router = Router();

router.get("/user/:userId", getUserOfferOutlines);
router.get("/active/:userId", getActiveUserOfferOutline);
router.post("/", createUserOfferOutline);
router.put("/:id", updateUserOfferOutline);
router.post("/:outlineId/activate/:userId", setActiveUserOfferOutline);
router.delete("/:id", deleteUserOfferOutline);

export default router;


