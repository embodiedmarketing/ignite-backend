CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"offer_id" integer,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"platform" text NOT NULL,
	"url" text,
	"member_count" integer,
	"description" text,
	"target_relevance" integer,
	"status" text DEFAULT 'identified' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"offer_id" integer,
	"customer_name" text,
	"platform" text,
	"status" text NOT NULL,
	"notes" text,
	"outcome" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_experience_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"delivery_method" text NOT NULL,
	"duration" text NOT NULL,
	"communication_frequency" text NOT NULL,
	"onboarding_elements" text[],
	"custom_onboarding_info" text,
	"feedback_method" text NOT NULL,
	"has_upsells" boolean DEFAULT false NOT NULL,
	"next_offer_type" text,
	"next_offer_ready" boolean DEFAULT false,
	"upsell_timeline" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ica_interview_transcripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"customer_name" text,
	"interview_date" timestamp,
	"platform" text,
	"duration" text,
	"raw_transcript" text NOT NULL,
	"extracted_insights" jsonb,
	"tags" text[],
	"notes" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"note_key" varchar NOT NULL,
	"content" text NOT NULL,
	"source" varchar DEFAULT 'manual',
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "interview_notes_user_id_note_key_unique" UNIQUE("user_id","note_key")
);
--> statement-breakpoint
CREATE TABLE "interview_notes_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"note_key" varchar NOT NULL,
	"content" text,
	"action_type" varchar NOT NULL,
	"source" varchar DEFAULT 'manual',
	"session_id" varchar,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "issue_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_email" varchar,
	"issue_type" varchar NOT NULL,
	"priority" varchar DEFAULT 'medium' NOT NULL,
	"status" varchar DEFAULT 'open' NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"steps_to_reproduce" text,
	"expected_behavior" text,
	"actual_behavior" text,
	"browser_info" jsonb,
	"page_url" varchar,
	"screenshot_url" varchar,
	"admin_notes" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messaging_strategies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar DEFAULT 'Messaging Strategy' NOT NULL,
	"content" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"source_data" jsonb,
	"completion_percentage" integer DEFAULT 0,
	"missing_information" jsonb,
	"recommendations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_outlines" (
	"id" serial PRIMARY KEY NOT NULL,
	"offer_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"outline" text NOT NULL,
	"completeness" integer DEFAULT 0 NOT NULL,
	"missing_information" jsonb,
	"recommendations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"offer_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"section" text NOT NULL,
	"question_key" text NOT NULL,
	"question_text" text NOT NULL,
	"response" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"total_steps" integer DEFAULT 6 NOT NULL,
	"description" text,
	"pricing" jsonb,
	"target_customer" jsonb,
	"value_proposition" text,
	"conversation_script" text,
	"community_outreach" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sales_page_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar NOT NULL,
	"content" text NOT NULL,
	"draft_number" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"source_data" jsonb,
	"inputs" jsonb,
	"completeness" integer DEFAULT 0 NOT NULL,
	"missing_elements" jsonb,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"inputs" jsonb,
	"completeness" integer DEFAULT 0 NOT NULL,
	"missing_elements" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "section_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"step_number" integer NOT NULL,
	"section_title" varchar(255) NOT NULL,
	"offer_number" integer DEFAULT 1 NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "step_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"step_number" integer NOT NULL,
	"step_name" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"detailed_content" text,
	"tips" text[],
	"examples" text[],
	"resources" jsonb,
	"questions" text[],
	"action_items" text[],
	"videos" jsonb,
	"workbook_url" text,
	"interactive_prompts" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strategy_interview_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"strategy_id" integer NOT NULL,
	"transcript_id" integer NOT NULL,
	"contribution_type" varchar DEFAULT 'source' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"content" text NOT NULL,
	"tags" text[],
	"step_number" integer,
	"is_public" boolean DEFAULT true NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_offer_outlines" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"offer_id" integer,
	"offer_number" integer DEFAULT 1 NOT NULL,
	"title" varchar DEFAULT 'Offer Outline' NOT NULL,
	"content" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"source_data" jsonb,
	"completion_percentage" integer DEFAULT 0,
	"missing_information" jsonb,
	"recommendations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"step_number" integer NOT NULL,
	"completed_prompts" jsonb,
	"brand_voice" text,
	"customer_avatar" jsonb,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"subscription_status" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workbook_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"offer_id" integer,
	"offer_number" integer DEFAULT 1 NOT NULL,
	"step_number" integer NOT NULL,
	"section_title" varchar NOT NULL,
	"question_key" varchar NOT NULL,
	"response_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_completions" ADD CONSTRAINT "section_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_offer_outlines" ADD CONSTRAINT "user_offer_outlines_offer_id_user_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."user_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_offers" ADD CONSTRAINT "user_offers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workbook_responses" ADD CONSTRAINT "workbook_responses_offer_id_user_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."user_offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_token" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_user_id" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_password_reset_tokens_expires_at" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_section_completions_user_step" ON "section_completions" USING btree ("user_id","step_number");--> statement-breakpoint
CREATE INDEX "idx_section_completions_unique" ON "section_completions" USING btree ("user_id","step_number","section_title");--> statement-breakpoint
CREATE INDEX "idx_section_completions_offer_unique" ON "section_completions" USING btree ("user_id","step_number","section_title","offer_number");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "unique_strategy_transcript" ON "strategy_interview_links" USING btree ("strategy_id","transcript_id");--> statement-breakpoint
CREATE INDEX "user_offer_outline_idx" ON "user_offer_outlines" USING btree ("user_id","offer_id");--> statement-breakpoint
CREATE INDEX "user_active_outline_idx" ON "user_offer_outlines" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "user_offer_number_outline_idx" ON "user_offer_outlines" USING btree ("user_id","offer_number");--> statement-breakpoint
CREATE INDEX "idx_user_offers_user_id" ON "user_offers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_offers_active" ON "user_offers" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_offer_number_question" ON "workbook_responses" USING btree ("user_id","offer_number","step_number","question_key");--> statement-breakpoint
CREATE INDEX "unique_user_offer_question" ON "workbook_responses" USING btree ("user_id","offer_id","step_number","question_key");--> statement-breakpoint
CREATE INDEX "unique_user_question" ON "workbook_responses" USING btree ("user_id","step_number","question_key");--> statement-breakpoint
CREATE INDEX "step4_sales_strategy_idx" ON "workbook_responses" USING btree ("user_id","step_number","section_title");--> statement-breakpoint
CREATE INDEX "step4_customer_locations_idx" ON "workbook_responses" USING btree ("user_id","question_key");--> statement-breakpoint
CREATE INDEX "step4_daily_planning_idx" ON "workbook_responses" USING btree ("step_number","section_title","user_id");--> statement-breakpoint
CREATE INDEX "offer_responses_idx" ON "workbook_responses" USING btree ("offer_id","step_number");--> statement-breakpoint
CREATE INDEX "offer_number_responses_idx" ON "workbook_responses" USING btree ("user_id","offer_number","step_number");