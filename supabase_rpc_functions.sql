-- ============================================================================
-- OPTIONAL: SUPABASE RPC FUNCTIONS FOR ATOMIC QUOTA MANAGEMENT
-- ============================================================================
-- Run this in Supabase SQL Editor (optional, auth-helpers has fallback logic)
-- These functions provide atomic quota decrements to prevent race conditions
-- ============================================================================

-- Function: Atomic decrement of user quotas
CREATE OR REPLACE FUNCTION public.decrement_quota(
  user_id uuid,
  quota_field text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_value integer;
BEGIN
  -- Validate quota_field parameter
  IF quota_field NOT IN ('debates_remaining', 'chats_remaining') THEN
    RAISE EXCEPTION 'Invalid quota field: %. Must be debates_remaining or chats_remaining', quota_field;
  END IF;

  -- Perform atomic decrement based on field
  IF quota_field = 'debates_remaining' THEN
    UPDATE public.user_profiles
    SET 
      debates_remaining = GREATEST(debates_remaining - 1, 0),
      updated_at = NOW()
    WHERE id = user_id
    RETURNING debates_remaining INTO new_value;
  ELSE
    UPDATE public.user_profiles
    SET 
      chats_remaining = GREATEST(chats_remaining - 1, 0),
      updated_at = NOW()
    WHERE id = user_id
    RETURNING chats_remaining INTO new_value;
  END IF;

  -- Check if update actually happened (user exists)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found for user_id: %', user_id;
  END IF;

  -- Return the new remaining value
  RETURN json_build_object('remaining', new_value);
END;
$$;

-- Grant execute permission to authenticated users (NextAuth will use service role)
GRANT EXECUTE ON FUNCTION public.decrement_quota TO authenticated, service_role;

-- ============================================================================
-- TESTING THE FUNCTION
-- ============================================================================
-- 1. Create a test user profile (if you don't have one)
/*
INSERT INTO public.user_profiles (id, email, tier, debates_remaining, chats_remaining)
VALUES (gen_random_uuid(), 'test@example.com', 'free', 5, 10);
*/

-- 2. Get the user ID
/*
SELECT id, debates_remaining, chats_remaining FROM public.user_profiles WHERE email = 'test@example.com';
*/

-- 3. Test decrement function (replace <user_id> with actual ID)
/*
SELECT public.decrement_quota('<user_id>', 'debates_remaining');
SELECT public.decrement_quota('<user_id>', 'chats_remaining');
*/

-- 4. Verify the decrement worked
/*
SELECT id, debates_remaining, chats_remaining FROM public.user_profiles WHERE email = 'test@example.com';
*/

-- ============================================================================
-- CLEANUP (Optional - if you want to remove the function)
-- ============================================================================
-- DROP FUNCTION IF EXISTS public.decrement_quota(uuid, text);

-- ============================================================================
-- NOTES
-- ============================================================================
-- - This function is OPTIONAL
-- - If not present, auth-helpers.ts will use fallback logic (regular UPDATE)
-- - RPC provides atomic operations, preventing race conditions
-- - SECURITY DEFINER means it runs with creator privileges (bypasses RLS)
-- - Validated quota_field parameter prevents SQL injection
-- - GREATEST(..., 0) ensures value never goes below 0
-- - Updates updated_at timestamp automatically
-- ============================================================================
