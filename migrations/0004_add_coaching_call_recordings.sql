CREATE TABLE "coaching_call_recordings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
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
CREATE INDEX "idx_coaching_call_recordings_user_id" ON "coaching_call_recordings" ("user_id");--> statement-breakpoint
CREATE INDEX "idx_coaching_call_recordings_date" ON "coaching_call_recordings" ("date");--> statement-breakpoint
CREATE INDEX "idx_coaching_call_recordings_category" ON "coaching_call_recordings" ("category");--> statement-breakpoint
ALTER TABLE "coaching_call_recordings" ADD CONSTRAINT "coaching_call_recordings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;



