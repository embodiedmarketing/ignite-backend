CREATE TABLE IF NOT EXISTS "business_incubator_customer_journey_videos" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar(255) NOT NULL,
  "vimeo_id" varchar(100) NOT NULL,
  "order" integer DEFAULT 0 NOT NULL,
  "step_number" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customer_journey_videos_order" ON "business_incubator_customer_journey_videos" USING btree ("order");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_incubator_messaging_videos" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar(255) NOT NULL,
  "vimeo_id" varchar(100) NOT NULL,
  "order" integer DEFAULT 0 NOT NULL,
  "step_number" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messaging_videos_order" ON "business_incubator_messaging_videos" USING btree ("order");
