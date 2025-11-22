-- ============================================
-- BETA PROTECTION: Zero Quota for New OAuth Users
-- ============================================
-- Date: 2025-11-23
-- Purpose: Prevent free API usage until Stripe payment is integrated (Phase 2B)
-- Impact: New OAuth users get 0 quota by default, access code users unaffected
-- Rationale: App is not production-ready, no rate limiting, prevents abuse

-- ============================================
-- PART 1: Change Default Quotas
-- ============================================

-- Change default debates quota from 5 to 0 for new OAuth sign-ups
ALTER TABLE public.user_profiles 
  ALTER COLUMN debates_remaining SET DEFAULT 0;

-- Change default chats quota from 10 to 0 for new OAuth sign-ups
ALTER TABLE public.user_profiles 
  ALTER COLUMN chats_remaining SET DEFAULT 0;

-- ============================================
-- PART 2: Add Comments for Documentation
-- ============================================

COMMENT ON COLUMN public.user_profiles.debates_remaining IS 
  'Number of debates remaining. Default 0 for OAuth (beta protection until Phase 2B Stripe). Quota assigned via access code for beta testers, or after payment for paid users.';

COMMENT ON COLUMN public.user_profiles.chats_remaining IS 
  'Number of chats remaining. Default 0 for OAuth (beta protection until Phase 2B Stripe). Quota assigned via access code for beta testers, or after payment for paid users.';

-- ============================================
-- PART 3: Optional - Reset Existing Free Users
-- ============================================

-- UNCOMMENT BELOW to reset existing free-tier OAuth users to 0 quota
-- This will affect all existing OAuth users who haven't paid
-- WARNING: This will prevent existing users from using the app until they pay or enter access code

-- UPDATE public.user_profiles 
-- SET 
--   debates_remaining = 0, 
--   chats_remaining = 0 
-- WHERE 
--   tier = 'free' 
--   AND (debates_remaining > 0 OR chats_remaining > 0);

-- ============================================
-- PART 4: Verification
-- ============================================

-- Verify the default values were changed
SELECT 
  column_name, 
  column_default, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'user_profiles' 
  AND column_name IN ('debates_remaining', 'chats_remaining');

-- Expected output:
-- column_name          | column_default | data_type | is_nullable
-- ---------------------|----------------|-----------|------------
-- debates_remaining    | 0              | integer   | YES
-- chats_remaining      | 0              | integer   | YES

-- ============================================
-- ROLLBACK (if needed)
-- ============================================

-- To revert back to previous free quota:
-- ALTER TABLE public.user_profiles ALTER COLUMN debates_remaining SET DEFAULT 5;
-- ALTER TABLE public.user_profiles ALTER COLUMN chats_remaining SET DEFAULT 10;

-- ============================================
-- NOTES
-- ============================================

-- 1. This migration ONLY affects NEW OAuth users created after running this SQL
-- 2. Existing OAuth users keep their current quota values
-- 3. Access code users are UNAFFECTED (they use Upstash KV, not this table)
-- 4. When Phase 2B (Stripe) is ready:
--    - Keep defaults at 0
--    - Assign quota after successful payment
--    - Free tier stays 0, paid tiers get quota based on plan
-- 5. Beta testers should use access codes (managed separately in Upstash KV)

-- ============================================
-- END OF MIGRATION
-- ============================================
