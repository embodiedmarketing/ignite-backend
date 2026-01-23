import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";

// Load environment variables
dotenv.config();

// Configure Neon
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
neonConfig.pipelineTLS = false;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applyMigration() {
  const client = await pool.connect();

  try {
    console.log("Starting migration: Create device_tokens table...");

    // Read the migration SQL file
    const migrationPath = join(process.cwd(), "migrations", "0006_smart_nick_fury.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    // Split by statement breakpoint and execute each statement
    const statements = migrationSQL
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await client.query(statement);
        console.log(`✓ Statement ${i + 1} executed successfully`);
      }
    }

    console.log("\n✅ Migration completed successfully!");
    console.log("The device_tokens table has been created.");
  } catch (error: any) {
    // Check if table already exists
    if (error?.code === "42P07" || error?.message?.includes("already exists")) {
      console.log("⚠️  device_tokens table already exists. Skipping migration.");
    } else {
      console.error("❌ Migration failed:", error);
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration()
  .then(() => {
    console.log("Migration script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script error:", error);
    process.exit(1);
  });


