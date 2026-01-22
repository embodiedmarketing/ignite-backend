DROP INDEX IF EXISTS "idx_coaching_call_recordings_user_id";--> statement-breakpoint
ALTER TABLE "coaching_call_recordings" DROP CONSTRAINT IF EXISTS "coaching_call_recordings_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "coaching_call_recordings" DROP COLUMN IF EXISTS "user_id";