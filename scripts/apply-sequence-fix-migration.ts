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
    console.log("Starting migration: Fix coaching_call_recordings sequence...");

    // Read and execute the migration SQL
    const migrationPath = join(process.cwd(), "migrations", "0008_fix_coaching_call_recordings_sequence.sql");
    const migrationSQL = readFileSync(migrationPath, "utf-8");
    
    console.log("Executing migration SQL...");
    await client.query(migrationSQL);
    console.log("✓ Migration applied successfully");

    // Verify the fix by checking the current sequence value
    const result = await client.query("SELECT last_value, is_called FROM coaching_call_recordings_id_seq");
    console.log("\nCurrent sequence state:", result.rows[0]);
    
    const maxIdResult = await client.query("SELECT MAX(id) as max_id FROM coaching_call_recordings");
    const maxId = maxIdResult.rows[0]?.max_id || 0;
    console.log("Current max ID in table:", maxId);

    console.log("\n✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
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

