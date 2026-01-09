-- Fix the sequence for coaching_call_recordings to prevent duplicate key errors
-- This resets the sequence to be one higher than the current maximum ID

SELECT setval(
  'coaching_call_recordings_id_seq',
  COALESCE((SELECT MAX(id) FROM coaching_call_recordings), 0) + 1,
  false
);

