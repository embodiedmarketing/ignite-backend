ALTER TABLE "interview_notes" DROP CONSTRAINT "interview_notes_user_id_transcript_id_note_key_unique";--> statement-breakpoint
ALTER TABLE "interview_notes" DROP CONSTRAINT "interview_notes_transcript_id_ica_interview_transcripts_id_fk";
--> statement-breakpoint
ALTER TABLE "interview_notes" DROP COLUMN "transcript_id";--> statement-breakpoint
ALTER TABLE "interview_notes" ADD CONSTRAINT "interview_notes_user_id_note_key_unique" UNIQUE("user_id","note_key");