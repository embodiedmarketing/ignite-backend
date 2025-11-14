
-- Drop the existing constraint
ALTER TABLE section_completions DROP CONSTRAINT IF EXISTS section_completions_user_id_step_number_section_title_key;

-- Add new constraint that includes offer_number
ALTER TABLE section_completions ADD CONSTRAINT section_completions_user_id_step_number_section_title_offer_number_key 
UNIQUE (user_id, step_number, section_title, offer_number);
