/**
 * Runs all pending Drizzle migrations against the database.
 * Use this to apply schema changes (e.g. new columns like is_active) from migrations/*.sql.
 *
 * Usage: npm run db:migrate
 */
import * as dotenv from "dotenv";
import { join } from "path";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

// Load env first so DATABASE_URL is set before db is imported
dotenv.config();

const migrationsFolder = join(process.cwd(), "migrations");

async function runMigrations() {
  // Dynamic import after dotenv.config() to ensure env vars are loaded
  const { db } = await import("../src/config/db.js");
  console.log("Running Drizzle migrations from:", migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log("✓ All migrations applied successfully.");
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
