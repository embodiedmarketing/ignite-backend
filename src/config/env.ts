import "dotenv/config";
import { cleanEnv, str, port } from "envalid";

/**
 * Environment variable configuration and validation
 * Uses envalid for type-safe environment variable validation
 */

export const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ["development", "production", "test"],
    default: "development",
  }),
  PORT: port({ default: 5000 }),
  DATABASE_URL: str(),
  SESSION_SECRET: str({ default: "development-secret-change-in-production" }),
  ANTHROPIC_API_KEY: str(),
  STRIPE_SECRET_KEY: str({ default: "" }),
  VITE_STRIPE_PUBLIC_KEY: str({ default: "" }),
  STRIPE_PUBLIC_KEY: str({ default: "" }),
  SENDGRID_API_KEY: str({ default: "" }),
  SENDGRID_SENDER_EMAIL: str({ default: "" }),
  ONTRAPORT_WEBHOOK_SECRET: str({ default: "" }),
  GMAIL_USER: str({ default: "" }),
  GMAIL_APP_PASSWORD: str({ default: "" }),
  FRONTEND_URL: str({ default: "http://localhost:5173" }),
  REPL_ID: str({ default: "" }),
});

export default env;
