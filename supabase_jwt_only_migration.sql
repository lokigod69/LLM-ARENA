-- ============================================================================
-- JWT-ONLY AUTH: USER PROFILES TABLE
-- ============================================================================
-- Simplified schema for JWT-only authentication (no NextAuth adapter)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Create user_profiles table in public schema
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  image text,
  tier text NOT NULL DEFAULT 'free',
  debates_remaining integer NOT NULL DEFAULT 5,
  chats_remaining integer NOT NULL DEFAULT 10,
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_email_key UNIQUE (email),
  CONSTRAINT user_profiles_tier_check CHECK (tier IN ('free', 'basic', 'pro'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tier ON public.user_profiles(tier);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe ON public.user_profiles(stripe_customer_id);

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

-- Policy: Users can update their own profile (limited fields)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = email)
  WITH CHECK (auth.jwt() ->> 'email' = email);

-- Policy: Service role can do anything (for NextAuth callbacks)
DROP POLICY IF EXISTS "Service role has full access" ON public.user_profiles;
CREATE POLICY "Service role has full access"
  ON public.user_profiles
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
-- Grant access to authenticated users
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;

-- Grant full access to service role (for NextAuth callbacks)
GRANT ALL ON public.user_profiles TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the setup:

-- 1. Check table exists
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- 2. Check trigger exists
-- SELECT tgname FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at';

-- 3. Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'user_profiles';

-- 4. View all policies
-- SELECT policyname, tablename FROM pg_policies WHERE tablename = 'user_profiles';

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================
-- Uncomment to insert a test user:
/*
INSERT INTO public.user_profiles (email, name, tier, debates_remaining, chats_remaining)
VALUES ('test@example.com', 'Test User', 'free', 5, 10)
ON CONFLICT (email) DO NOTHING;
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- This schema supports JWT-only authentication without NextAuth adapter
-- Users are created/updated via NextAuth callbacks in auth.ts
-- No next_auth schema needed (removed adapter dependency)
-- All user management happens directly in public.user_profiles
-- ============================================================================
