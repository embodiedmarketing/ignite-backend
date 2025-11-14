import { Router } from "express";
import {
  createPaymentIntent,
  handleStripeWebhook,
  createCheckoutSession,
} from "../controllers/payment.controller";

const router = Router();

router.post("/create-payment-intent", createPaymentIntent);
router.post("/stripe-webhook", handleStripeWebhook);
router.post("/create-checkout-session", createCheckoutSession);

export default router;

