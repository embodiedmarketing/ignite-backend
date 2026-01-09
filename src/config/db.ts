import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "../models/schema";

neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 25,
  min: 5,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 20000,
  maxUses: 5000,
  allowExitOnIdle: true,
});

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
});

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
  });
});

export const db = drizzle({ client: pool, schema });
