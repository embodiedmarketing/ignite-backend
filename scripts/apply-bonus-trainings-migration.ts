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

const CATEGORY_ID = "cat-business-incubator";
const SERIES_MESSAGING_ID = "series-messaging";
const SERIES_CUSTOMER_JOURNEY_ID = "series-customer-journey";

async function applyMigration() {
  const client = await pool.connect();

  try {
    console.log("Creating bonus training tables...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS bonus_training_categories (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bonus_training_series (
        id VARCHAR(255) PRIMARY KEY,
        category_id VARCHAR(255) NOT NULL REFERENCES bonus_training_categories(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        theme_color VARCHAR(50) NOT NULL DEFAULT 'purple'
          CHECK (theme_color IN ('purple', 'blue', 'green', 'orange')),
        "order" INTEGER NOT NULL DEFAULT 0,
        step_number_base INTEGER NOT NULL DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS bonus_training_videos (
        id VARCHAR(255) PRIMARY KEY,
        series_id VARCHAR(255) NOT NULL REFERENCES bonus_training_series(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        vimeo_id VARCHAR(255) NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        step_number INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bonus_training_categories_order
      ON bonus_training_categories("order");
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bonus_training_series_category
      ON bonus_training_series(category_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bonus_training_series_order
      ON bonus_training_series("order");
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bonus_training_videos_series
      ON bonus_training_videos(series_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bonus_training_videos_order
      ON bonus_training_videos("order");
    `);

    const existingCategory = await client.query(
      "SELECT id FROM bonus_training_categories WHERE id = $1",
      [CATEGORY_ID]
    );

    if (existingCategory.rows.length === 0) {
      console.log("Seeding Business Incubator category and series...");
      await client.query(
        `INSERT INTO bonus_training_categories (id, title, description, "order")
         VALUES ($1, $2, $3, $4)`,
        [
          CATEGORY_ID,
          "Business Incubator Training",
          "Exclusive workshop series hosted live with Emily Hirsh",
          0,
        ]
      );

      await client.query(
        `INSERT INTO bonus_training_series
          (id, category_id, title, description, theme_color, "order", step_number_base)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7),
          ($8, $2, $9, $10, $11, $12, $13)`,
        [
          SERIES_MESSAGING_ID,
          CATEGORY_ID,
          "Business Incubator: Your Messaging",
          "Advanced messaging strategies and frameworks to refine your communication",
          "blue",
          0,
          100,
          SERIES_CUSTOMER_JOURNEY_ID,
          "Business Incubator: Your Customer Journey",
          "Map and optimize every touchpoint in your customer's experience",
          "purple",
          1,
          200,
        ]
      );
    } else {
      console.log("Category already seeded, skipping category/series seed.");
    }

    const existingVideos = await client.query(
      "SELECT COUNT(*)::int AS count FROM bonus_training_videos"
    );
    if (existingVideos.rows[0].count === 0) {
      console.log("Migrating legacy business incubator videos...");

      const messagingVideos = await client.query(`
        SELECT title, vimeo_id, "order", step_number
        FROM business_incubator_messaging_videos
        ORDER BY "order" ASC
      `);

      for (const [index, video] of messagingVideos.rows.entries()) {
        await client.query(
          `INSERT INTO bonus_training_videos
            (id, series_id, title, vimeo_id, "order", step_number)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [
            `video-messaging-${index + 1}`,
            SERIES_MESSAGING_ID,
            video.title,
            video.vimeo_id,
            video.order,
            video.step_number,
          ]
        );
      }

      const customerJourneyVideos = await client.query(`
        SELECT title, vimeo_id, "order", step_number
        FROM business_incubator_customer_journey_videos
        ORDER BY "order" ASC
      `);

      for (const [index, video] of customerJourneyVideos.rows.entries()) {
        await client.query(
          `INSERT INTO bonus_training_videos
            (id, series_id, title, vimeo_id, "order", step_number)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [
            `video-customer-journey-${index + 1}`,
            SERIES_CUSTOMER_JOURNEY_ID,
            video.title,
            video.vimeo_id,
            video.order,
            video.step_number,
          ]
        );
      }

      if (
        messagingVideos.rows.length === 0 &&
        customerJourneyVideos.rows.length === 0
      ) {
        console.log("No legacy videos found, seeding default videos...");
        await client.query(`
          INSERT INTO bonus_training_videos (id, series_id, title, vimeo_id, "order", step_number) VALUES
            ('video-messaging-1', '${SERIES_MESSAGING_ID}', 'Business Incubator: Your Messaging - Week 1', '1121271019/c3616c2a0e', 0, 100),
            ('video-messaging-2', '${SERIES_MESSAGING_ID}', 'Business Incubator: Your Messaging - Week 2', '1121271278/86bd9d1152', 1, 101),
            ('video-messaging-3', '${SERIES_MESSAGING_ID}', 'Business Incubator: Your Messaging - Week 3', '1121271529/2b6435887b', 2, 102),
            ('video-messaging-4', '${SERIES_MESSAGING_ID}', 'Business Incubator: Your Messaging - Week 4', '1121271752/657f5cbba6', 3, 103),
            ('video-customer-journey-1', '${SERIES_CUSTOMER_JOURNEY_ID}', 'Week 1: Your Foundation', '1121271914/cfc6fad702', 0, 200),
            ('video-customer-journey-2', '${SERIES_CUSTOMER_JOURNEY_ID}', 'Week 2: Your Audience', '1121272036/c5438aeed2', 1, 201),
            ('video-customer-journey-3', '${SERIES_CUSTOMER_JOURNEY_ID}', 'Week 3: Your Sales Funnel', '1123018184/a3613d0b09', 2, 202),
            ('video-customer-journey-4', '${SERIES_CUSTOMER_JOURNEY_ID}', 'Week 4: Your Customer Experience', '1126899282/3340433dfa', 3, 203)
          ON CONFLICT (id) DO NOTHING;
        `);
      }
    } else {
      console.log("Bonus training videos already exist, skipping video migration.");
    }

    console.log("\n✅ Bonus trainings migration completed successfully!");
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
