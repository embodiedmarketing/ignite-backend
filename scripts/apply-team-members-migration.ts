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
    console.log("Starting migration: Create team_members table...");

    // Check if table already exists
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'team_members';
    `);

    if (checkResult.rows.length > 0) {
      console.log("✓ Table 'team_members' already exists");
      return;
    }

    // Create the table
    await client.query(`
      CREATE TABLE "team_members" (
        "id" varchar(255) PRIMARY KEY NOT NULL,
        "name" varchar(255) NOT NULL,
        "title" varchar(500) NOT NULL,
        "description" text NOT NULL,
        "vimeo_id" varchar(255) NOT NULL,
        "step_number" integer NOT NULL,
        "order" integer DEFAULT 0 NOT NULL,
        "background_color" varchar(50) DEFAULT 'blue' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("✓ Table 'team_members' created");

    // Create index on order column
    await client.query(`
      CREATE INDEX "idx_team_members_order" ON "team_members" ("order");
    `);
    console.log("✓ Index 'idx_team_members_order' created");

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

