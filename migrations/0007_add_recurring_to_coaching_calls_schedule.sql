-- Add recurring column to coaching_calls_schedule table
ALTER TABLE "coaching_calls_schedule" ADD COLUMN "recurring" boolean DEFAULT false NOT NULL;


