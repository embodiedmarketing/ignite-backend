import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { getSession } from "./middlewares/session.middleware";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { registerRoutes } from "./routes";
import { env } from "./config/env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  console.log("env.NODE_ENV", env.NODE_ENV);
  console.log("env.FRONTEND_URL", env.FRONTEND_URL);

  const allowedOrigins =
    env.NODE_ENV === "development"
      ? [
          "http://localhost:5173",
          "https://ignite-backend-stagging.up.railway.app"
        ]
      : [env.FRONTEND_URL!];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"], // allow all methods
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"], // adjust for your headers
    })
  );

  // Body parsing middleware
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: false, limit: "2mb" }));

  // Security headers
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const requestPath = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (requestPath.startsWith("/api")) {
        let logLine = `${req.method} ${requestPath} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        console.log(logLine);
      }
    });

    next();
  });

  // Session middleware
  app.use(getSession());

  // Serve attached_assets directory for file access
  // This allows access to uploaded files and assets
  // Path is relative to backend directory for independent backend structure
  // __dirname points to backend/src, so we go up one level to backend/, then into attached_assets
  const attachedAssetsPath = path.resolve(__dirname, "..", "attached_assets");
  if (fs.existsSync(attachedAssetsPath)) {
    app.use(
      "/attached_assets",
      express.static(attachedAssetsPath, {
        maxAge: "1y", // Cache for 1 year
        etag: true,
        lastModified: true,
      })
    );
    console.log(
      `[Backend] Serving attached_assets from: ${attachedAssetsPath}`
    );
  } else {
    console.warn(
      `[Backend] attached_assets directory not found at: ${attachedAssetsPath}`
    );
    console.warn(`[Backend] Creating attached_assets directory...`);
    // Create the directory if it doesn't exist
    try {
      fs.mkdirSync(attachedAssetsPath, { recursive: true });
      console.log(
        `[Backend] Created attached_assets directory at: ${attachedAssetsPath}`
      );
    } catch (error) {
      console.error(
        `[Backend] Failed to create attached_assets directory:`,
        error
      );
    }
  }

  // Register all routes
  await registerRoutes(app);

  // Error handling middleware (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
