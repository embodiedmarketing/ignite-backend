import type { Request, Response } from "express";
import { getDatabaseHealth, getCacheStats, getSystemHealth } from "../services/health.service";

/**
 * Health check endpoint
 */
export async function healthCheck(req: Request, res: Response) {
  try {
    const health = await getDatabaseHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}

