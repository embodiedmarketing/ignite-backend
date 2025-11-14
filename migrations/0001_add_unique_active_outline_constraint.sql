
-- Add unique constraint to ensure only one active outline per user per offer number
-- First, fix any existing data that violates the constraint
UPDATE user_offer_outlines 
SET is_active = false 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, offer_number) id 
  FROM user_offer_outlines 
  WHERE is_active = true 
  ORDER BY user_id, offer_number, updated_at DESC
);

-- Add the unique constraint
CREATE UNIQUE INDEX CONCURRENTLY unique_active_offer_outline 
ON user_offer_outlines (user_id, offer_number, is_active) 
WHERE is_active = true;
