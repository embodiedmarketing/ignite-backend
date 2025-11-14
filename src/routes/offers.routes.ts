import { Router } from "express";
import {
  getOffersByUser,
  getOffer,
  createOffer,
  updateOffer,
  deleteOffer,
} from "../controllers/offers.controller";

const router = Router();

router.get("/user/:userId", getOffersByUser);
router.get("/:id", getOffer);
router.post("/", createOffer);
router.patch("/:id", updateOffer);
router.delete("/:id", deleteOffer);

export default router;

