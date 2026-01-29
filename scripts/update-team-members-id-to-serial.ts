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
    console.log("Starting migration: Update team_members id to serial...");

    // Check current column type
    const checkResult = await client.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'team_members' AND column_name = 'id';
    `);

    if (checkResult.rows.length === 0) {
      console.log("⚠️  Table 'team_members' does not exist. Please create it first.");
      return;
    }

    const currentType = checkResult.rows[0].data_type;
    
    if (currentType === 'integer' || currentType === 'bigint') {
      console.log("✓ Column 'id' is already numeric type");
      
      // Check if it has a sequence (serial)
      const sequenceCheck = await client.query(`
        SELECT column_default 
        FROM information_schema.columns 
        WHERE table_name = 'team_members' AND column_name = 'id';
      `);
      
      if (sequenceCheck.rows[0].column_default?.includes('nextval')) {
        console.log("✓ Column 'id' already has auto-increment (serial)");
        return;
      }
    }

    // If it's varchar, we need to convert it
    if (currentType === 'character varying' || currentType === 'varchar') {
      console.log("⚠️  Converting id column from varchar to serial...");
      console.log("⚠️  WARNING: This will delete all existing data in team_members table!");
      
      // Drop the table and recreate it with serial id
      await client.query(`DROP TABLE IF EXISTS "team_members" CASCADE;`);
      console.log("✓ Old table dropped");
      
      // Recreate with serial id
      await client.query(`
        CREATE TABLE "team_members" (
          "id" serial PRIMARY KEY NOT NULL,
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
      console.log("✓ Table 'team_members' recreated with serial id");
      
      // Create index
      await client.query(`
        CREATE INDEX "idx_team_members_order" ON "team_members" ("order");
      `);
      console.log("✓ Index 'idx_team_members_order' created");
    } else {
      // If it's already integer but not serial, add the sequence
      console.log("Adding sequence to existing integer column...");
      
      // Create sequence
      await client.query(`
        CREATE SEQUENCE IF NOT EXISTS team_members_id_seq;
      `);
      
      // Set the sequence to start from the max id + 1
      await client.query(`
        SELECT setval('team_members_id_seq', COALESCE((SELECT MAX(id) FROM team_members), 0) + 1, false);
      `);
      
      // Set default value
      await client.query(`
        ALTER TABLE "team_members" 
        ALTER COLUMN "id" SET DEFAULT nextval('team_members_id_seq');
      `);
      
      // Make sequence owned by the column
      await client.query(`
        ALTER SEQUENCE team_members_id_seq OWNED BY team_members.id;
      `);
      
      console.log("✓ Sequence added to id column");
    }

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

