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
    console.log("Starting migration: Update faqs id to serial...");

    // Check if table exists
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'faqs';
    `);

    if (checkResult.rows.length === 0) {
      console.log("⚠️  Table 'faqs' does not exist. Creating with serial id...");
      
      // Create table with serial id
      await client.query(`
        CREATE TABLE "faqs" (
          "id" serial PRIMARY KEY NOT NULL,
          "question" text NOT NULL,
          "answer" text NOT NULL,
          "order" integer DEFAULT 0 NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
      `);
      console.log("✓ Table 'faqs' created with serial id");
      
      // Create index
      await client.query(`
        CREATE INDEX "idx_faqs_order" ON "faqs" ("order");
      `);
      console.log("✓ Index 'idx_faqs_order' created");
      return;
    }

    // Check current column type
    const columnCheck = await client.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'faqs' AND column_name = 'id';
    `);

    const currentType = columnCheck.rows[0].data_type;
    
    if (currentType === 'integer' || currentType === 'bigint') {
      console.log("✓ Column 'id' is already numeric type");
      
      // Check if it has a sequence (serial)
      const sequenceCheck = await client.query(`
        SELECT column_default 
        FROM information_schema.columns 
        WHERE table_name = 'faqs' AND column_name = 'id';
      `);
      
      if (sequenceCheck.rows[0].column_default?.includes('nextval')) {
        console.log("✓ Column 'id' already has auto-increment (serial)");
        return;
      }
    }

    // If it's varchar, we need to convert it
    if (currentType === 'character varying' || currentType === 'varchar') {
      console.log("⚠️  Converting id column from varchar to serial...");
      console.log("⚠️  WARNING: This will delete all existing data in faqs table!");
      
      // Drop the table and recreate it with serial id
      await client.query(`DROP TABLE IF EXISTS "faqs" CASCADE;`);
      console.log("✓ Old table dropped");
      
      // Recreate with serial id
      await client.query(`
        CREATE TABLE "faqs" (
          "id" serial PRIMARY KEY NOT NULL,
          "question" text NOT NULL,
          "answer" text NOT NULL,
          "order" integer DEFAULT 0 NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
      `);
      console.log("✓ Table 'faqs' recreated with serial id");
      
      // Create index
      await client.query(`
        CREATE INDEX "idx_faqs_order" ON "faqs" ("order");
      `);
      console.log("✓ Index 'idx_faqs_order' created");
    } else {
      // If it's already integer but not serial, add the sequence
      console.log("Adding sequence to existing integer column...");
      
      // Create sequence
      await client.query(`
        CREATE SEQUENCE IF NOT EXISTS faqs_id_seq;
      `);
      
      // Set the sequence to start from the max id + 1
      await client.query(`
        SELECT setval('faqs_id_seq', COALESCE((SELECT MAX(id) FROM faqs), 0) + 1, false);
      `);
      
      // Set default value
      await client.query(`
        ALTER TABLE "faqs" 
        ALTER COLUMN "id" SET DEFAULT nextval('faqs_id_seq');
      `);
      
      // Make sequence owned by the column
      await client.query(`
        ALTER SEQUENCE faqs_id_seq OWNED BY faqs.id;
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

