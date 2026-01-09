import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../models/schema";

// Configure Neon for serverless environment
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

// Configure pool with connection limits optimized for 100+ concurrent users
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 25, // Increased to handle 100 concurrent users
  min: 5, // Keep more minimum connections ready
  idleTimeoutMillis: 60000, // Longer idle timeout for high load
  connectionTimeoutMillis: 20000, // Increased connection timeout
  maxUses: 5000, // Reduced to prevent connection staleness
  allowExitOnIdle: true,
});

// Add error handling to prevent crashes from connection errors
pool.on("error", (err) => {
  // Filter out known WebSocket ErrorEvent issues that are harmless
  const errorMessage = err?.message || String(err);
  if (
    errorMessage.includes("Cannot set property message") ||
    errorMessage.includes("ErrorEvent")
  ) {
    // Silently ignore - this is a known issue with WebSocket error handling
    return;
  }
  console.error("Unexpected database pool error:", err);
  // Don't crash the application - just log the error
});

// Handle pool connect errors
pool.on("connect", (client) => {
  client.on("error", (err) => {
    // Filter out known WebSocket ErrorEvent issues
    const errorMessage = err?.message || String(err);
    if (
      errorMessage.includes("Cannot set property message") ||
      errorMessage.includes("ErrorEvent")
    ) {
      // Silently ignore - this is a known issue with WebSocket error handling
      return;
    }
    console.error("Database client error:", err);
    // Don't crash the application - just log the error
  });
});

export const db = drizzle({ client: pool, schema });
