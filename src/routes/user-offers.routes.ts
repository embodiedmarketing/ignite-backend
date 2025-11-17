import { Router } from "express";
import {
  getUserOffers,
  getActiveUserOffer,
  getUserOfferById,
  createUserOffer,
  updateUserOffer,
  deleteUserOffer,
  setActiveUserOffer,
} from "../controllers/user-offers.controller";

const router = Router();

router.get("/user/:userId", getUserOffers);
router.get("/active/:userId", getActiveUserOffer);
router.get("/:id", getUserOfferById);
router.post("/", createUserOffer);
router.put("/:id", updateUserOffer);
router.delete("/:id", deleteUserOffer);
router.post("/:id/set-active", setActiveUserOffer);

export default router;




