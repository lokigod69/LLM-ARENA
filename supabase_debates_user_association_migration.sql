-- Debates User Association Migration
-- Adds user_email column to debates table for Phase 2A user tracking
-- Run this in Supabase SQL Editor

-- Add user_email column if it doesn't exist
ALTER TABLE debates ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Create index for performance when querying user's debates
CREATE INDEX IF NOT EXISTS idx_debates_user_email ON debates(user_email);

-- Add comment
COMMENT ON COLUMN debates.user_email IS 'Email of authenticated user who created the debate (OAuth users)';

-- Note: Existing debates will have NULL user_email (created before this migration)
-- Only new debates from OAuth users will have email populated
