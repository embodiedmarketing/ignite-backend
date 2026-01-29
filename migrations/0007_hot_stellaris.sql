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
--> statement-breakpoint
CREATE INDEX "idx_onboarding_steps_order" ON "onboarding_steps" USING btree ("order");