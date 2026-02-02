import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as dotenv from "dotenv";

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
    console.log("Starting migration: Create journey_steps table...");

    // Check if table already exists
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'journey_steps';
    `);

    if (checkResult.rows.length > 0) {
      console.log("✓ Table 'journey_steps' already exists");
      return;
    }

    // Create the table
    await client.query(`
      CREATE TABLE "journey_steps" (
        "id" serial PRIMARY KEY NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text NOT NULL,
        "color" varchar(50) DEFAULT 'blue' NOT NULL,
        "order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("✓ Table 'journey_steps' created");

    // Create index on order column
    await client.query(`
      CREATE INDEX "idx_journey_steps_order" ON "journey_steps" ("order");
    `);
    console.log("✓ Index 'idx_journey_steps_order' created");

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

