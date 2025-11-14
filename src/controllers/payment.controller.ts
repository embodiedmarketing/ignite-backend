import type { Request, Response } from "express";
import Stripe from "stripe";
import { storage } from "../services/storage.service";

// Initialize Stripe
const secretKey =
  process.env.VITE_STRIPE_PUBLIC_KEY || process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;
if (secretKey) {
  stripe = new Stripe(secretKey);
  console.log("Stripe initialized successfully");
} else {
  console.warn("Stripe not initialized - payment features will be disabled");
}

/**
 * Create a payment intent for one-time payment
 */
export async function createPaymentIntent(req: Request, res: Response) {
  try {
    if (!stripe) {
      return res
        .status(503)
        .json({ message: "Payment processing is currently unavailable" });
    }

    // Create temporary customer for pre-auth payment
    const customer = await stripe.customers.create({
      email: req.body.email || "temp@launch.com",
    });

    // Create one-time payment intent for Launch platform access
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 39700, // $397.00
      currency: "usd",
      customer: customer.id,
      description: "Launch - Business Building Platform - One-time Access",
      metadata: {
        product: "Launch Platform Access",
        type: "one_time_payment",
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: "created",
    });
  } catch (error: any) {
    console.error("Payment intent creation error:", error);
    res.status(400).json({
      message: "Error creating payment",
      error: error.message,
    });
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  if (!stripe) {
    return res
      .status(503)
      .json({ message: "Payment processing is currently unavailable" });
  }

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err: any) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "invoice.payment_succeeded":
      const invoice = event.data.object as any;
      if (invoice.subscription) {
        // Update user subscription status
        const subscription = await stripe!.subscriptions.retrieve(
          invoice.subscription
        );
        const customer = await stripe!.customers.retrieve(
          subscription.customer as string
        );

        if (customer && !customer.deleted && customer.metadata?.userId) {
          await storage.updateUserStripeInfo(
            customer.metadata.userId,
            customer.id,
            subscription.id
          );
        }
      }
      break;
    case "invoice.payment_failed":
      // Handle failed payment
      break;
    case "customer.subscription.deleted":
      const deletedSubscription = event.data.object;
      const deletedCustomer = await stripe!.customers.retrieve(
        deletedSubscription.customer as string
      );

      if (
        deletedCustomer &&
        !deletedCustomer.deleted &&
        deletedCustomer.metadata?.userId
      ) {
        await storage.updateUserStripeInfo(
          deletedCustomer.metadata.userId,
          deletedCustomer.id
        );
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
}

/**
 * Create a Stripe checkout session for hosted checkout
 */
export async function createCheckoutSession(req: Request, res: Response) {
  try {
    if (!stripe) {
      return res
        .status(503)
        .json({ message: "Payment processing is currently unavailable" });
    }

    const {
      amount = 397,
      currency = "usd",
      product_name = "Launch - Business Building Platform",
    } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: product_name,
              description:
                "Complete access to AI-powered business development system",
            },
            unit_amount: amount * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${
        req.headers.origin || "http://localhost:5000"
      }/dashboard?payment=success`,
      cancel_url: `${
        req.headers.origin || "http://localhost:5000"
      }/subscribe?payment=cancelled`,
      metadata: {
        product: "launch-platform",
        amount: amount.toString(),
      },
    });

    res.json({ sessionId: session.id });
  } catch (error: any) {
    console.error("Checkout session error:", error);
    res.status(500).json({
      message: "Error creating checkout session: " + error.message,
      error: error.code || "unknown_error",
    });
  }
}

