CREATE TABLE "coaching_call_recordings" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"date" varchar(50) NOT NULL,
	"duration" varchar(255),
	"vimeo_id" varchar(255),
	"description" text,
	"transcript" text,
	"category" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_coaching_call_recordings_date" ON "coaching_call_recordings" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_coaching_call_recordings_category" ON "coaching_call_recordings" USING btree ("category");