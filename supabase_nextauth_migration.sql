-- ============================================================================
-- NEXTAUTH.JS v5 + MATRIX ARENA USER PROFILES SCHEMA
-- ============================================================================
-- Run this in Supabase SQL Editor
-- This creates the NextAuth adapter tables + custom user_profiles table
-- ============================================================================

-- Create next_auth schema for NextAuth adapter tables
CREATE SCHEMA IF NOT EXISTS next_auth;

-- ============================================================================
-- NEXTAUTH ADAPTER TABLES (Auto-managed by @auth/supabase-adapter)
-- ============================================================================

-- Users table (core auth)
CREATE TABLE IF NOT EXISTS next_auth.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  email text,
  "emailVerified" timestamptz,
  image text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS users_email_idx ON next_auth.users(email);

-- Accounts table (OAuth provider linkage)
CREATE TABLE IF NOT EXISTS next_auth.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type text NOT NULL,
  provider text NOT NULL,
  "providerAccountId" text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  "userId" uuid NOT NULL,
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT provider_unique UNIQUE (provider, "providerAccountId"),
  CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") 
    REFERENCES next_auth.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS accounts_userId_idx ON next_auth.accounts("userId");

-- Verification tokens table (email magic links - future use)
CREATE TABLE IF NOT EXISTS next_auth.verification_tokens (
  identifier text NOT NULL,
  token text NOT NULL,
  expires timestamptz NOT NULL,
  CONSTRAINT verification_tokens_pkey PRIMARY KEY (token),
  CONSTRAINT token_identifier_unique UNIQUE (token, identifier)
);

CREATE INDEX IF NOT EXISTS verification_tokens_token_idx ON next_auth.verification_tokens(token);

-- Sessions table (OPTIONAL - only if using database sessions)
-- Currently using JWT sessions, so this table is not needed
-- Keeping definition for future reference
/*
CREATE TABLE IF NOT EXISTS next_auth.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  expires timestamptz NOT NULL,
  "sessionToken" text NOT NULL,
  "userId" uuid NOT NULL,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessionToken_unique UNIQUE ("sessionToken"),
  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") 
    REFERENCES next_auth.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sessions_userId_idx ON next_auth.sessions("userId");
CREATE INDEX IF NOT EXISTS sessions_sessionToken_idx ON next_auth.sessions("sessionToken");
*/

-- ============================================================================
-- MATRIX ARENA CUSTOM TABLES (Public schema)
-- ============================================================================

-- User profiles table (tier management, quotas, Stripe linkage)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY,
  email varchar(255) NOT NULL,
  tier varchar(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro')),
  debates_remaining integer NOT NULL DEFAULT 5,
  chats_remaining integer NOT NULL DEFAULT 10,
  stripe_customer_id varchar(255) UNIQUE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) 
    REFERENCES next_auth.users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_profiles_email_idx ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS user_profiles_stripe_idx ON public.user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS user_profiles_tier_idx ON public.user_profiles(tier);

-- ============================================================================
-- AUTO-CREATE USER PROFILE TRIGGER
-- ============================================================================
-- When a user signs up via OAuth, automatically create a free tier profile

CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, tier, debates_remaining, chats_remaining)
  VALUES (NEW.id, NEW.email, 'free', 5, 10)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_created
  AFTER INSERT ON next_auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_profile();

-- ============================================================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_user_profile_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_profile_updated
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_profile_timestamp();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on user_profiles for security

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile (except tier and stripe_customer_id)
-- Note: tier and stripe_customer_id should only be modified by server (service role)
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Service role can do anything (for server-side operations)
-- This is implicit via SECURITY DEFINER on functions

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant necessary permissions to anon and authenticated roles

GRANT USAGE ON SCHEMA next_auth TO anon, authenticated;
GRANT SELECT ON next_auth.users TO anon, authenticated;
GRANT SELECT ON next_auth.accounts TO anon, authenticated;
GRANT SELECT ON next_auth.verification_tokens TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after migration to verify setup

-- Check tables exist
-- SELECT tablename FROM pg_tables WHERE schemaname = 'next_auth';
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- Check trigger exists
-- SELECT tgname FROM pg_trigger WHERE tgname = 'on_user_created';

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'user_profiles';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Verify tables created: next_auth.users, next_auth.accounts, next_auth.verification_tokens, public.user_profiles
-- 2. Verify trigger created: on_user_created
-- 3. Expose next_auth schema in Supabase Dashboard > Settings > API > Exposed schemas
-- 4. Note down SUPABASE_SERVICE_ROLE_KEY for NextAuth adapter configuration
-- ============================================================================
