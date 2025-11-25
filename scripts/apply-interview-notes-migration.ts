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
    console.log("Starting migration: Add transcript_id to interview_notes...");

    // Step 1: Drop old constraint
    console.log("Step 1: Dropping old unique constraint...");
    await client.query(`
      ALTER TABLE "interview_notes" 
      DROP CONSTRAINT IF EXISTS "interview_notes_user_id_note_key_unique";
    `);
    console.log("✓ Old constraint dropped");

    // Step 2: Add transcript_id column
    console.log("Step 2: Adding transcript_id column...");
    await client.query(`
      ALTER TABLE "interview_notes" 
      ADD COLUMN IF NOT EXISTS "transcript_id" integer;
    `);
    console.log("✓ transcript_id column added");

    // Step 3: Add foreign key
    console.log("Step 3: Adding foreign key constraint...");
    await client.query(`
      ALTER TABLE "interview_notes" 
      DROP CONSTRAINT IF EXISTS "interview_notes_transcript_id_ica_interview_transcripts_id_fk";
    `);
    await client.query(`
      ALTER TABLE "interview_notes" 
      ADD CONSTRAINT "interview_notes_transcript_id_ica_interview_transcripts_id_fk" 
      FOREIGN KEY ("transcript_id") REFERENCES "public"."ica_interview_transcripts"("id") 
      ON DELETE no action ON UPDATE no action;
    `);
    console.log("✓ Foreign key constraint added");

    // Step 4: Add new unique constraint
    console.log("Step 4: Adding new unique constraint...");
    await client.query(`
      ALTER TABLE "interview_notes" 
      DROP CONSTRAINT IF EXISTS "interview_notes_user_id_transcript_id_note_key_unique";
    `);
    await client.query(`
      ALTER TABLE "interview_notes" 
      ADD CONSTRAINT "interview_notes_user_id_transcript_id_note_key_unique" 
      UNIQUE("user_id","transcript_id","note_key");
    `);
    console.log("✓ New unique constraint added");

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
