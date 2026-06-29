import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as dotenv from "dotenv";

dotenv.config();

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
    console.log("Creating business incubator video tables...");

    await client.query(
      "DROP TABLE IF EXISTS business_incubator_messaging_videos CASCADE"
    );
    await client.query(
      "DROP TABLE IF EXISTS business_incubator_customer_journey_videos CASCADE"
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS business_incubator_customer_journey_videos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        vimeo_id VARCHAR(100) NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        step_number INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_customer_journey_videos_order
      ON business_incubator_customer_journey_videos("order");
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS business_incubator_messaging_videos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        vimeo_id VARCHAR(100) NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        step_number INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messaging_videos_order
      ON business_incubator_messaging_videos("order");
    `);

    console.log("Seeding customer journey videos...");
    await client.query(`
      INSERT INTO business_incubator_customer_journey_videos (title, vimeo_id, "order", step_number) VALUES
        ('Week 1: Your Foundation', '1121271914/cfc6fad702', 0, 200),
        ('Week 2: Your Audience', '1121272036/c5438aeed2', 1, 201),
        ('Week 3: Your Sales Funnel', '1123018184/a3613d0b09', 2, 202),
        ('Week 4: Your Customer Experience', '1126899282/3340433dfa', 3, 203);
    `);

    console.log("Seeding messaging videos...");
    await client.query(`
      INSERT INTO business_incubator_messaging_videos (title, vimeo_id, "order", step_number) VALUES
        ('Business Incubator: Your Messaging - Week 1', '1121271019/c3616c2a0e', 0, 100),
        ('Business Incubator: Your Messaging - Week 2', '1121271278/86bd9d1152', 1, 101),
        ('Business Incubator: Your Messaging - Week 3', '1121271529/2b6435887b', 2, 102),
        ('Business Incubator: Your Messaging - Week 4', '1121271752/657f5cbba6', 3, 103);
    `);

    console.log("\n✅ Business incubator videos migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
