import type { Request, Response } from "express";
import { userMonitoring } from "../utils/user-monitoring";

/**
 * Get user activity metrics
 */
export async function getUserMetrics(req: Request, res: Response) {
  try {
    const metrics = await userMonitoring.getUserActivityMetrics();
    res.json(metrics);
  } catch (error) {
    console.error("Error getting user metrics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Get health alerts
 */
export async function getHealthAlerts(req: Request, res: Response) {
  try {
    const alerts = await userMonitoring.generateHealthAlerts();
    res.json(alerts);
  } catch (error) {
    console.error("Error generating health alerts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * Track user activity
 */
export async function trackUserActivity(req: Request, res: Response) {
  try {
    const { userId, activityType, metadata } = req.body;
    userMonitoring.trackUserActivity(userId, activityType, metadata);
    res.json({ success: true });
  } catch (error) {
    console.error("Error tracking user activity:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

