CREATE TABLE "interview_processing_jobs" (
	"id" varchar PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"transcript_ids" integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
	"processed_transcript_ids" integer[] DEFAULT ARRAY[]::integer[] NOT NULL,
	"total_transcripts" integer DEFAULT 0 NOT NULL,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"last_heartbeat" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "interview_notes" DROP CONSTRAINT "interview_notes_user_id_note_key_unique";--> statement-breakpoint
ALTER TABLE "activities" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "communities" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "customer_experience_plans" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "email_tracking" ALTER COLUMN "open_rate" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "email_tracking" ALTER COLUMN "click_rate" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "ica_interview_transcripts" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "sales_pages" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "user_progress" ALTER COLUMN "user_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "forum_posts" ADD COLUMN "attachments" jsonb;--> statement-breakpoint
ALTER TABLE "forum_threads" ADD COLUMN "attachments" jsonb;--> statement-breakpoint
ALTER TABLE "interview_notes" ADD COLUMN "transcript_id" integer;--> statement-breakpoint
ALTER TABLE "live_launches" ADD COLUMN "offer_cost" varchar;--> statement-breakpoint
ALTER TABLE "interview_processing_jobs" ADD CONSTRAINT "interview_processing_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_interview_jobs_user_id" ON "interview_processing_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_interview_jobs_status" ON "interview_processing_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_interview_jobs_created_at" ON "interview_processing_jobs" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_experience_plans" ADD CONSTRAINT "customer_experience_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ica_interview_transcripts" ADD CONSTRAINT "ica_interview_transcripts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_notes" ADD CONSTRAINT "interview_notes_transcript_id_ica_interview_transcripts_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."ica_interview_transcripts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_pages" ADD CONSTRAINT "sales_pages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_notes" ADD CONSTRAINT "interview_notes_user_id_transcript_id_note_key_unique" UNIQUE("user_id","transcript_id","note_key");