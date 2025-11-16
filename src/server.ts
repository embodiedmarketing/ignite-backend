import "dotenv/config";
import express from "express";
import { createServer, type Server } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import path from "path";
import fs from "fs";
import { startAccountabilityScheduler } from "./utils/accountability-scheduler";

/**
 * Start the server
 */
async function startServer() {
  // Global error handlers
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    // Don't exit the process - continue running
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error(
      "Unhandled Promise Rejection at:",
      promise,
      "reason:",
      reason
    );
    // Don't exit the process - continue running
  });

  const app = await createApp();
  const server = createServer(app);

  // Serve deployment validation scripts (if needed)
  app.get("/deployment-health-monitor.js", (req, res) => {
    res.setHeader("Content-Type", "text/javascript");
    res.sendFile(path.join(process.cwd(), "deployment-health-monitor.js"));
  });

  app.get("/deployment-preparation-validation.js", (req, res) => {
    res.setHeader("Content-Type", "text/javascript");
    res.sendFile(
      path.join(process.cwd(), "deployment-preparation-validation.js")
    );
  });

  app.get("/environment-validation-script.js", (req, res) => {
    res.setHeader("Content-Type", "text/javascript");
    res.sendFile(path.join(process.cwd(), "environment-validation-script.js"));
  });

  app.get("/database-backup-utility.js", (req, res) => {
    res.setHeader("Content-Type", "text/javascript");
    res.sendFile(path.join(process.cwd(), "database-backup-utility.js"));
  });

  app.get("/complete-deployment-readiness.js", (req, res) => {
    res.setHeader("Content-Type", "text/javascript");
    res.sendFile(path.join(process.cwd(), "complete-deployment-readiness.js"));
  });

  // Backend API server - serves only API endpoints
  // Frontend should be served separately or via a reverse proxy
  console.log(`[Backend] Running in ${env.NODE_ENV} mode`);
  console.log(
    `[Backend] API endpoints available at http://localhost:${env.PORT}/api`
  );

  // Start server
  console.log(`[Server] Starting server on port ${env.PORT}`);
  const port = env.PORT || 5000;
  const listenOptions: {
    port: number;
    host: string;
    reusePort?: boolean;
  } = {
    port,
    host: "0.0.0.0",
  };

  // Windows does not support reusePort
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }

  server.listen(listenOptions, () => {
    console.log(`[Server] Listening on port ${port}`);

    // Start the weekly accountability thread scheduler
    startAccountabilityScheduler();
  });

  return server;
}

// Start the server
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
