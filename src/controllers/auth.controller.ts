import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { hashPassword, verifyPassword } from "../services/auth.service";
import { storage } from "../services/storage.service";
import { getUserId } from "../middlewares/auth.middleware";
import {
  signupUserSchema,
  loginUserSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  type User,
} from "../models";
import {
  sendPasswordResetEmail,
  sendPasswordChangeConfirmation,
} from "../services/email.service";
import {
  handleOntraportWebhook,
  validateOntraportWebhook,
} from "../services/ontraport.service";

/**
 * Sign up a new user
 */
export async function signup(req: Request, res: Response) {
  try {
    const validatedData = signupUserSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(validatedData.email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password and create user
    const passwordHash = await hashPassword(validatedData.password);
    const user = await storage.createUser({
      email: validatedData.email,
      passwordHash,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      subscriptionStatus: "active",
    });

    // Automatically log in the new user
    req.session.userId = user.id;

    // Return user without password
    const { passwordHash: _, ...userWithoutPassword } = user;
    res.status(201).json({
      message: "User created successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("[SIGNUP] Error:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
}

/**
 * Log in a user
 */
export async function login(req: Request, res: Response) {
  try {
    const validatedData = loginUserSchema.parse(req.body);

    // Find user by email
    const user = await storage.getUserByEmail(validatedData.email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user has a password set
    if (!user.passwordHash || user.passwordHash.trim() === "") {
      return res.status(400).json({
        message:
          "Password not set. Please use the 'Forgot Password' link to set your password.",
        needsPasswordSetup: true,
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(
      validatedData.password,
      user.passwordHash
    );
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(200).json({ 
        message: "Your account has been deactivated. Please contact support.",
        user
      });
    }

    // Update last login timestamp
    await storage.updateUser(user.id, { lastLoginAt: new Date() });

    // Record login event
    await storage.recordUserLogin({
      userId: user.id,
      ipAddress:
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        null,
      userAgent: req.headers["user-agent"] || null,
    });

    // Create session
    req.session.userId = user.id;

    // Return user without password
    const { passwordHash, ...userWithoutPassword } = user;
    res.json({ message: "Login successful", user: userWithoutPassword });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Failed to login" });
  }
}

/**
 * Log out a user
 */
export async function logout(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to logout" });
    }
    res.json({ message: "Logout successful" });
  });
}

/**
 * Get current user
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is active
    if (user.isActive === false) {
      // Destroy session if user is inactive
      req.session.destroy(() => {});
      return res.status(403).json({ 
        message: "Your account has been deactivated. Please contact support." 
      });
    }

    // Return user without password hash
    const { passwordHash, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
}

/**
 * Forgot password - send reset email
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const { email } = result.data;

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal whether user exists for security
      return res.json({
        message:
          "If that email address is in our system, we've sent a password reset link.",
      });
    }

    // Generate secure reset token
    const crypto = await import("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token in database
    await storage.createPasswordResetToken({
      userId: user.id,
      token,
      expiresAt,
      used: false,
    });

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(email, token);

    if (!emailSent) {
      console.error(`Failed to send password reset email to ${email}`);
      return res.status(500).json({
        message: "Failed to send reset email. Please try again later.",
      });
    }

    res.json({
      message:
        "If that email address is in our system, we've sent a password reset link.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid reset request" });
    }

    const { token, password } = result.data;

    // Find and validate token
    const resetToken = await storage.getPasswordResetToken(token);
    if (!resetToken) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Check if token is expired or already used
    if (resetToken.used || new Date() > resetToken.expiresAt) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Find user
    const user = await storage.getUser(resetToken.userId);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(password);
    await storage.updateUser(user.id, { passwordHash });

    // Mark token as used
    await storage.markTokenAsUsed(resetToken.id);

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Change password (for authenticated users)
 */
export async function changePassword(req: Request, res: Response) {
  try {
    if (!req.session.userId) {
      return res
        .status(401)
        .json({ message: "Must be logged in to change password" });
    }

    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ message: "Invalid password change request" });
    }

    const { currentPassword, newPassword } = result.data;

    // Get current user
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(newPassword);
    await storage.updateUser(user.id, { passwordHash });

    // Send confirmation email
    await sendPasswordChangeConfirmation(user.email);

    console.log(`Password changed for user: ${user.email}`);
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
}

/**
 * Set password for users who registered through Ontraport
 */
export async function setPassword(req: Request, res: Response) {
  try {
    const { email, newPassword } = req.body;

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if this is a temporary password (from Ontraport registration)
    if (!user.passwordHash.endsWith("TEMP")) {
      return res.status(400).json({ message: "Password already set" });
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(newPassword);
    await storage.updateUser(user.id, { passwordHash });

    res.json({ message: "Password set successfully" });
  } catch (error) {
    console.error("Set password error:", error);
    res.status(500).json({ message: "Failed to set password" });
  }
}

/**
 * Manual password reset (admin only)
 */
export async function manualPasswordReset(req: Request, res: Response) {
  try {
    const { email, newPassword, adminKey } = req.body;

    // Simple admin key check for manual resets
    if (adminKey !== "launch-admin-reset-2025") {
      return res.status(403).json({ message: "Unauthorized admin access" });
    }

    // Validate inputs
    if (!email || !newPassword) {
      return res
        .status(400)
        .json({ message: "Email and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash new password and update user
    const passwordHash = await hashPassword(newPassword);
    await storage.updateUser(user.id, { passwordHash });

    console.log(`Manual password reset completed for user: ${email}`);

    res.json({
      message: "Password reset successfully",
      userEmail: email,
      userId: user.id,
      resetTimestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Manual password reset error:", error);
    res.status(500).json({ message: "Failed to reset password" });
  }
}

/**
 * Create test user (development only)
 */
export async function createTestUser(req: Request, res: Response) {
  try {
    // Check if test user already exists
    const existingUser = await storage.getUserByEmail("test@launch.com");
    if (existingUser) {
      return res.json({
        message: "Test user already exists",
        email: "test@launch.com",
      });
    }

    // Create test user with properly hashed temporary password
    const tempPasswordHash = await hashPassword("tempPassword123");
    await storage.createUser({
      email: "test@launch.com",
      passwordHash: tempPasswordHash + "TEMP", // Add TEMP suffix
      firstName: "Test",
      lastName: "User",
      profileImageUrl: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: "active",
    });

    res.json({
      message: "Test user created successfully",
      email: "test@launch.com",
      note: "Use /set-password to set your password, or login will redirect you there",
    });
  } catch (error) {
    console.error("Test user creation error:", error);
    res.status(500).json({ message: "Failed to create test user" });
  }
}

/**
 * Ontraport webhook handler
 */
export async function ontraportWebhook(req: Request, res: Response) {
  try {
    const rawBody = JSON.stringify(req.body);
    const signature = req.headers["x-ontraport-signature"] as string;
    const webhookSecret = process.env.ONTRAPORT_WEBHOOK_SECRET;

    // Validate webhook if secret is configured
    if (webhookSecret && signature) {
      const isValid = validateOntraportWebhook(
        rawBody,
        signature,
        webhookSecret
      );
      if (!isValid) {
        return res.status(401).json({ message: "Invalid webhook signature" });
      }
    }

    // Process the webhook
    const user = await handleOntraportWebhook(req.body);

    if (user) {
      res.json({ message: "User created successfully", userId: user.id });
    } else {
      res.json({ message: "Webhook processed, no action taken" });
    }
  } catch (error) {
    console.error("Ontraport webhook error:", error);
    res.status(500).json({ message: "Failed to process webhook" });
  }
}
