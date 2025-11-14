import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { isAuthenticated } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  signupUserSchema,
  loginUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../models";

const router = Router();

// Public routes
router.post("/signup", validate(signupUserSchema), authController.signup);
router.post("/login", validate(loginUserSchema), authController.login);
router.post("/logout", authController.logout);
router.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  authController.resetPassword
);
router.post("/set-password", authController.setPassword);
router.post("/reset-password-manual", authController.manualPasswordReset);
router.post(
  "/change-password",
  validate(changePasswordSchema),
  authController.changePassword
);

// Protected routes
router.get("/user", isAuthenticated, authController.getCurrentUser);

// Webhooks
router.post("/ontraport-webhook", authController.ontraportWebhook);

// Development routes
router.post("/create-test-user", authController.createTestUser);

export default router;
