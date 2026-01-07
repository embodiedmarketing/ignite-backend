import session from "express-session";
import connectPg from "connect-pg-simple";
import { env } from "../config/env";
import { pool } from "../config/db";

/**
 * Session configuration middleware
 */
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool: pool, // Use the existing Neon pool instead of creating a new connection
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  // In production (HTTPS), cookies must be secure
  // For cross-domain cookies (Vercel frontend + Heroku backend), we need sameSite: "none"
  const isProduction = env.NODE_ENV === "production";

  return session({
    secret: env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    name: "connect.sid",
    cookie: {
      httpOnly: true,
      secure: isProduction, // Must be true for HTTPS in production
      maxAge: sessionTtl,
      sameSite: isProduction ? "none" : "lax", // "none" required for cross-domain cookies (Vercel + Heroku)
      domain: undefined, // Don't set domain to allow cookies across different domains
      path: "/",
    },
  });
}
