-- Database Migration: Make stance column nullable
-- Run this in Supabase SQL Editor to support optional stance in chat sessions
-- This migration allows new sessions without stance (using persona's hardcoded baseStubbornness)
-- while preserving old sessions with stance values for backward compatibility

-- Check if stance column exists and is NOT NULL
DO $$ 
BEGIN
    -- Make stance nullable if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'chat_sessions' 
        AND column_name = 'stance'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE chat_sessions ALTER COLUMN stance DROP NOT NULL;
    END IF;
    
    -- Drop existing check constraint
    ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_stance_check;
    
    -- Add new check constraint allowing NULL
    ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_stance_check 
        CHECK (stance IS NULL OR (stance >= 0 AND stance <= 10));
        
    -- Add comment
    EXECUTE 'COMMENT ON COLUMN chat_sessions.stance IS ''DEPRECATED: Personas use hardcoded baseStubbornness. Kept for backward compatibility.''';
END $$;

-- Verify
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'chat_sessions' 
AND column_name = 'stance';
