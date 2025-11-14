import { storage } from "./storage.service";
import type { User } from "../models";

interface OntraportWebhookPayload {
  contact_id: string;
  email: string;
  firstname?: string;
  lastname?: string;
  tags_added?: string[];
  tags_removed?: string[];
}

// The tag ID that triggers user creation (you'll set this in Ontraport)
const REGISTRATION_TAG = "launch-platform-access";

export async function handleOntraportWebhook(payload: OntraportWebhookPayload): Promise<User | null> {
  try {
    // Check if the registration tag was added
    if (!payload.tags_added?.includes(REGISTRATION_TAG)) {
      console.log("Webhook received but registration tag not found");
      return null;
    }

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(payload.email);
    if (existingUser) {
      console.log(`User already exists for email: ${payload.email}`);
      return existingUser;
    }

    // Create new user account
    const newUser = await storage.createUser({
      email: payload.email,
      passwordHash: generateTemporaryPassword(), // They'll set their own password on first login
      firstName: payload.firstname || "User",
      lastName: payload.lastname || "",
      // Store Ontraport contact ID for future reference
      profileImageUrl: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: "active", // They just paid through Ontraport
    });

    console.log(`New user created from Ontraport: ${newUser.email}`);
    return newUser;

  } catch (error) {
    console.error("Error processing Ontraport webhook:", error);
    throw error;
  }
}

// Generate a temporary password that user will reset on first login
function generateTemporaryPassword(): string {
  return Math.random().toString(36).slice(-12) + "TEMP";
}

// Validate webhook authenticity (Ontraport sends a signature)
export function validateOntraportWebhook(payload: string, signature: string, secret: string): boolean {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

