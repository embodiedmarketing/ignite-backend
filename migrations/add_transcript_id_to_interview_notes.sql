-- Migration: Add transcript_id to interview_notes table
-- This allows linking interview notes to specific transcripts

-- Step 1: Drop the old unique constraint (if it exists)
ALTER TABLE "interview_notes" DROP CONSTRAINT IF EXISTS "interview_notes_user_id_note_key_unique";

-- Step 2: Add the transcript_id column (nullable, so existing records won't break)
ALTER TABLE "interview_notes" ADD COLUMN IF NOT EXISTS "transcript_id" integer;

-- Step 3: Add foreign key constraint to ica_interview_transcripts
ALTER TABLE "interview_notes" 
ADD CONSTRAINT IF NOT EXISTS "interview_notes_transcript_id_ica_interview_transcripts_id_fk" 
FOREIGN KEY ("transcript_id") REFERENCES "public"."ica_interview_transcripts"("id") 
ON DELETE no action ON UPDATE no action;

-- Step 4: Add new unique constraint that includes transcript_id
-- This allows one note per user+transcript+noteKey combination
ALTER TABLE "interview_notes" 
ADD CONSTRAINT IF NOT EXISTS "interview_notes_user_id_transcript_id_note_key_unique" 
UNIQUE("user_id","transcript_id","note_key");

