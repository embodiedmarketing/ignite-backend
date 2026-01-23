import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";

const router = Router();

// All routes require authentication
router.use(isAuthenticated);

router.post("/last-visited", userController.saveLastVisited);
router.patch(
  "/profile",
  userController.upload.single("profilePhoto"),
  userController.updateProfile
);
router.post("/fcm-token", userController.registerFCMToken);
router.delete("/fcm-token", userController.removeFCMToken);

export default router;

