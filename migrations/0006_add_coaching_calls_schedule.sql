CREATE TABLE "coaching_calls_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"day" varchar(20) NOT NULL,
	"time" varchar(50) NOT NULL,
	"date" varchar(50) NOT NULL,
	"description" text,
	"link" text,
	"color" varchar(20) DEFAULT 'blue' NOT NULL,
	"canceled" boolean DEFAULT false NOT NULL,
	"cancel_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_coaching_calls_schedule_date" ON "coaching_calls_schedule" ("date");--> statement-breakpoint
CREATE INDEX "idx_coaching_calls_schedule_category" ON "coaching_calls_schedule" ("category");


