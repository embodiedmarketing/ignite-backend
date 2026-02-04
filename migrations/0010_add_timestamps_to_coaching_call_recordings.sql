-- Add timestamps column for short summary view ([HH:MM:SS] Name - topic lines)
ALTER TABLE "coaching_call_recordings"
ADD COLUMN IF NOT EXISTS "timestamps" text;
