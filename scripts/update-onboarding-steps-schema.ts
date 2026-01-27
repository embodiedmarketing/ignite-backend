import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import dotenv from "dotenv";

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
    console.log("Starting migration: Update onboarding_steps table...");

    // Check if table exists and has data
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'onboarding_steps'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log("Table onboarding_steps does not exist. Creating it...");
      await client.query(`
        CREATE TABLE "onboarding_steps" (
          "id" serial PRIMARY KEY NOT NULL,
          "title" varchar(500) NOT NULL,
          "description" text NOT NULL,
          "descriptor" text,
          "color" varchar(50) NOT NULL,
          "order" integer DEFAULT 0 NOT NULL,
          "button_text" varchar(255),
          "button_link" varchar(500),
          "button_action" varchar(20),
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
      `);
      await client.query(`
        CREATE INDEX "idx_onboarding_steps_order" ON "onboarding_steps" USING btree ("order");
      `);
      console.log("✓ Table created successfully!");
      return;
    }

    // Check if button columns already exist
    const buttonTextCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'onboarding_steps' 
        AND column_name = 'button_text'
      );
    `);

    // Step 1: Add button columns if they don't exist
    if (!buttonTextCheck.rows[0].exists) {
      console.log("Adding button columns...");
      await client.query(`
        ALTER TABLE "onboarding_steps" 
        ADD COLUMN IF NOT EXISTS "button_text" varchar(255),
        ADD COLUMN IF NOT EXISTS "button_link" varchar(500),
        ADD COLUMN IF NOT EXISTS "button_action" varchar(20);
      `);
      console.log("✓ Button columns added");
    } else {
      console.log("✓ Button columns already exist");
    }

    // Step 2: Check current ID column type
    const idColumnCheck = await client.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'onboarding_steps' 
      AND column_name = 'id';
    `);

    const currentIdType = idColumnCheck.rows[0]?.data_type;

    if (currentIdType === 'integer' || currentIdType === 'smallint' || currentIdType === 'bigint') {
      console.log("✓ ID column is already an integer type");
      
      // Check if it's a serial (has a sequence)
      const sequenceCheck = await client.query(`
        SELECT pg_get_serial_sequence('onboarding_steps', 'id') as sequence_name;
      `);
      
      if (!sequenceCheck.rows[0].sequence_name) {
        console.log("Converting integer ID to serial...");
        // Create sequence
        await client.query(`
          CREATE SEQUENCE IF NOT EXISTS onboarding_steps_id_seq;
        `);
        // Set sequence owner
        await client.query(`
          ALTER SEQUENCE onboarding_steps_id_seq OWNED BY onboarding_steps.id;
        `);
        // Set default value
        await client.query(`
          ALTER TABLE onboarding_steps 
          ALTER COLUMN id SET DEFAULT nextval('onboarding_steps_id_seq');
        `);
        // Set sequence value to max(id) + 1
        await client.query(`
          SELECT setval('onboarding_steps_id_seq', COALESCE((SELECT MAX(id) FROM onboarding_steps), 0) + 1, false);
        `);
        console.log("✓ ID column converted to serial");
      } else {
        console.log("✓ ID column is already serial");
      }
    } else if (currentIdType === 'character varying' || currentIdType === 'text') {
      console.log("Converting ID column from varchar to serial...");
      
      // Check if there's existing data
      const rowCount = await client.query(`
        SELECT COUNT(*) as count FROM onboarding_steps;
      `);
      const count = parseInt(rowCount.rows[0].count);

      if (count === 0) {
        // No data, safe to drop and recreate
        console.log("No existing data found. Recreating ID column...");
        await client.query(`
          ALTER TABLE onboarding_steps DROP CONSTRAINT IF EXISTS onboarding_steps_pkey;
        `);
        await client.query(`
          ALTER TABLE onboarding_steps DROP COLUMN id;
        `);
        await client.query(`
          ALTER TABLE onboarding_steps ADD COLUMN id serial PRIMARY KEY;
        `);
        console.log("✓ ID column recreated as serial");
      } else {
        // Has data - need to preserve it
        console.log(`Found ${count} existing rows. Migrating data...`);
        
        // Create new integer ID column
        await client.query(`
          ALTER TABLE onboarding_steps ADD COLUMN id_new serial;
        `);
        
        // Populate new ID with sequential numbers
        await client.query(`
          UPDATE onboarding_steps 
          SET id_new = row_number() OVER (ORDER BY created_at);
        `);
        
        // Drop old primary key constraint
        await client.query(`
          ALTER TABLE onboarding_steps DROP CONSTRAINT IF EXISTS onboarding_steps_pkey;
        `);
        
        // Drop old varchar ID column
        await client.query(`
          ALTER TABLE onboarding_steps DROP COLUMN id;
        `);
        
        // Rename new column to id
        await client.query(`
          ALTER TABLE onboarding_steps RENAME COLUMN id_new TO id;
        `);
        
        // Add primary key constraint
        await client.query(`
          ALTER TABLE onboarding_steps ADD PRIMARY KEY (id);
        `);
        
        console.log("✓ ID column migrated to serial (data preserved)");
      }
    } else {
      console.log(`⚠ ID column type is ${currentIdType}. No changes made.`);
    }

    console.log("✓ Migration completed successfully!");
  } catch (error) {
    console.error("Error applying migration:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });

