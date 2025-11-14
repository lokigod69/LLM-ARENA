-- Character Chat Sessions Table Migration
-- Run this in Supabase SQL Editor to create the chat_sessions table

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,                       -- Optional, for future auth
  access_code VARCHAR(255),           -- For tracking/analytics
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Configuration
  model_name VARCHAR(100) NOT NULL,
  persona_id VARCHAR(100) NOT NULL,
  stance INTEGER CHECK (stance >= 0 AND stance <= 10),
  default_extensiveness INTEGER CHECK (default_extensiveness >= 1 AND default_extensiveness <= 5),
  
  -- Messages (JSONB array)
  messages JSONB NOT NULL DEFAULT '[]',
  
  -- Metadata
  total_tokens INTEGER DEFAULT 0,
  total_cost NUMERIC(10, 6) DEFAULT 0,
  message_count INTEGER GENERATED ALWAYS AS (jsonb_array_length(messages)) STORED
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_access_code ON chat_sessions(access_code);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_persona_id ON chat_sessions(persona_id);

-- Add comment
COMMENT ON TABLE chat_sessions IS 'Stores character chat sessions for Matrix Arena';

