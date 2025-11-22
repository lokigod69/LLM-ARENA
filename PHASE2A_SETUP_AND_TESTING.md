# Phase 2A Setup & Testing Guide

## ✅ What's Been Completed

1. ✅ NextAuth.js v5 dependencies installed
2. ✅ Auth configuration created (`auth.ts`)
3. ✅ API route handler created (`/api/auth/[...nextauth]`)
4. ✅ Auth helpers created (`src/lib/auth-helpers.ts`)
5. ✅ Environment variables updated (`.env.local.example`)
6. ✅ Root layout updated with SessionProvider
7. ✅ API route updated for dual auth (`/api/debate/step`)
8. ✅ UI components created:
   - `AccessCodeModal.tsx` - Updated with Google OAuth button
   - `UserMenu.tsx` - OAuth user dropdown
   - `SignInButton.tsx` - Sign in trigger button

## 🎯 Next Steps (In Order)

### Step 1: Run Supabase Schema Migration

**File:** `supabase_nextauth_migration.sql`

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project → SQL Editor
3. Open `supabase_nextauth_migration.sql` in this repository
4. Copy the entire content
5. Paste into Supabase SQL Editor
6. Click "Run"
7. Verify tables created:
   - `next_auth.users`
   - `next_auth.accounts`
   - `next_auth.verification_tokens`
   - `public.user_profiles`

**Verification Query:**
```sql
-- Check tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'next_auth';
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- Check trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'on_user_created';
```

### Step 2: Expose next_auth Schema in Supabase

1. Go to Supabase Dashboard → Settings → API
2. Scroll to "Exposed schemas"
3. Add `next_auth` to the list
4. Click "Save"

This allows the NextAuth adapter to access the schema.

### Step 3: Set Up Google OAuth

**File:** `GOOGLE_OAUTH_SETUP.md`

Follow the detailed instructions in that file to:
1. Create OAuth 2.0 credentials in Google Cloud Console
2. Configure redirect URIs
3. Obtain Client ID and Secret

**Quick Summary:**
- URL: https://console.cloud.google.com/apis/credentials
- Create OAuth 2.0 Client ID (Web application)
- Add redirect URI: `http://localhost:3000/api/auth/callback/google`
- Save Client ID and Secret

### Step 4: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local` (if not already done)
2. Generate AUTH_SECRET:
   ```bash
   openssl rand -hex 32
   ```
3. Add to `.env.local`:
   ```bash
   # NextAuth
   AUTH_SECRET=<generated_secret>
   NEXTAUTH_URL=http://localhost:3000
   
   # Google OAuth (from Step 3)
   GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx
   
   # Supabase (ensure SERVICE_ROLE_KEY is set)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Required for NextAuth adapter
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

### Step 5: Restart Development Server

```bash
npm run dev
```

This ensures all environment variables are loaded.

---

## 🧪 Testing Guide

### Test 1: Google OAuth Sign-In

1. Open app in browser: `http://localhost:3000`
2. If prompted with AccessCodeModal, click "Sign in with Google"
3. Should redirect to Google consent screen
4. Approve access
5. Should redirect back to app as signed-in user
6. Check browser console for any errors

**Expected Result:**
- ✅ User signed in with Google account
- ✅ User profile auto-created in Supabase (`user_profiles` table)
- ✅ Free tier assigned (5 debates, 10 chats)
- ✅ UserMenu appears in top-right (if integrated)

**Verify in Supabase:**
```sql
-- Check user was created
SELECT * FROM next_auth.users ORDER BY id DESC LIMIT 1;

-- Check profile was auto-created
SELECT * FROM public.user_profiles ORDER BY created_at DESC LIMIT 1;
```

### Test 2: Access Code Flow (Unchanged)

1. If signed in with OAuth, sign out first
2. Click "Enter Access Code" option in AccessCodeModal
3. Enter a valid access code (e.g., admin code or test token)
4. Should unlock app as before

**Expected Result:**
- ✅ Access code authentication still works
- ✅ KV quota tracking unchanged
- ✅ No interference with OAuth system

### Test 3: Debate with OAuth User

1. Sign in with Google OAuth
2. Start a new debate
3. Select models, topic, etc.
4. Click "Start Debate"

**Expected Result:**
- ✅ Debate starts successfully
- ✅ Debates remaining decrements (check UserMenu or Supabase)
- ✅ API returns correct `remaining` count

**Verify in Supabase:**
```sql
-- Check quota was decremented
SELECT debates_remaining FROM public.user_profiles WHERE email = 'your-email@gmail.com';
```

### Test 4: Quota Exhaustion (OAuth)

1. Sign in with OAuth (or use existing session)
2. Manually set quota to 0 in Supabase:
   ```sql
   UPDATE public.user_profiles SET debates_remaining = 0 WHERE email = 'your-email@gmail.com';
   ```
3. Try to start a new debate

**Expected Result:**
- ✅ Error message: "No debates remaining. Upgrade your plan to continue."
- ✅ Debate does not start
- ✅ Quota remains at 0

### Test 5: UserMenu Display

1. Sign in with Google OAuth
2. Locate UserMenu in top-right (if integrated into page)
3. Click avatar
4. Menu should display:
   - User name and email
   - Current tier (Free/Basic/Pro)
   - Debates and chats remaining
   - "Upgrade Plan" button (if not Pro)
   - "Sign Out" button

**Expected Result:**
- ✅ UserMenu renders correctly
- ✅ Displays accurate quota info
- ✅ Sign out works (redirects to home, clears session)

### Test 6: Dual Auth Coexistence

**Scenario A: OAuth → Access Code**
1. Sign in with Google OAuth
2. Sign out
3. Enter access code
4. Should work independently

**Scenario B: Access Code → OAuth**
1. Sign in with access code
2. Clear cookies or sign out
3. Sign in with Google OAuth
4. Should work independently

**Expected Result:**
- ✅ Both auth methods work independently
- ✅ No conflicts or errors
- ✅ Each tracks quota separately (OAuth → Supabase, Code → KV)

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@/auth'"

**Cause:** TypeScript path alias not resolved

**Fix:**
1. Check `tsconfig.json` has:
   ```json
   "paths": {
     "@/*": ["./src/*"],
     "@/auth": ["./auth.ts"]
   }
   ```
2. Restart TypeScript server in IDE
3. Restart dev server: `npm run dev`

### Error: "redirect_uri_mismatch" (Google OAuth)

**Cause:** Redirect URI in Google Console doesn't match

**Fix:**
1. Go to Google Cloud Console → Credentials
2. Edit OAuth 2.0 Client ID
3. Ensure redirect URI exactly matches:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
4. No trailing slashes!
5. Restart dev server

### Error: "Failed to fetch profile from Supabase"

**Cause:** 
- `SUPABASE_SERVICE_ROLE_KEY` not set
- `next_auth` schema not exposed
- Profile not auto-created

**Fix:**
1. Check `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`
2. Verify `next_auth` schema is exposed in Supabase settings
3. Check trigger exists:
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgname = 'on_user_created';
   ```
4. Manually create profile if needed:
   ```sql
   INSERT INTO public.user_profiles (id, email, tier, debates_remaining, chats_remaining)
   SELECT id, email, 'free', 5, 10 FROM next_auth.users WHERE email = 'your-email@gmail.com';
   ```

### Error: "Quota decrement failed"

**Cause:** Supabase RPC function doesn't exist (fallback logic should handle this)

**Optional Fix:** Create RPC function for atomic decrement:
```sql
-- Create atomic quota decrement function
CREATE OR REPLACE FUNCTION public.decrement_quota(
  user_id uuid,
  quota_field text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_value integer;
BEGIN
  -- Validate quota_field
  IF quota_field NOT IN ('debates_remaining', 'chats_remaining') THEN
    RAISE EXCEPTION 'Invalid quota field: %', quota_field;
  END IF;

  -- Atomic decrement
  IF quota_field = 'debates_remaining' THEN
    UPDATE public.user_profiles
    SET debates_remaining = GREATEST(debates_remaining - 1, 0)
    WHERE id = user_id
    RETURNING debates_remaining INTO new_value;
  ELSE
    UPDATE public.user_profiles
    SET chats_remaining = GREATEST(chats_remaining - 1, 0)
    WHERE id = user_id
    RETURNING chats_remaining INTO new_value;
  END IF;

  RETURN json_build_object('remaining', new_value);
END;
$$;
```

**Note:** The fallback logic in `auth-helpers.ts` handles this gracefully if RPC doesn't exist.

### Session Not Persisting After Sign-In

**Cause:** Cookie settings or NEXTAUTH_URL mismatch

**Fix:**
1. Check `NEXTAUTH_URL` matches your dev URL exactly: `http://localhost:3000`
2. Clear browser cookies
3. Restart dev server
4. Try in incognito/private window

### UserMenu Not Appearing

**Cause:** Not integrated into main page yet (expected)

**Fix:** You'll integrate this in your main page layout. Example:
```tsx
import SignInButton from '@/components/SignInButton';

// In your page header:
<SignInButton onSignInClick={() => setShowAccessModal(true)} />
```

---

## 📊 Database Monitoring Queries

### Check OAuth Users
```sql
SELECT 
  u.id, 
  u.email, 
  u.name, 
  u."emailVerified",
  u.image IS NOT NULL as has_image,
  p.tier,
  p.debates_remaining,
  p.chats_remaining,
  p.stripe_customer_id,
  u."createdAt" as created_at
FROM next_auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
ORDER BY u."createdAt" DESC;
```

### Check Quota Usage
```sql
SELECT 
  email,
  tier,
  debates_remaining,
  chats_remaining,
  created_at,
  updated_at
FROM public.user_profiles
ORDER BY updated_at DESC;
```

### Check OAuth Provider Accounts
```sql
SELECT 
  u.email,
  a.provider,
  a.type,
  a."providerAccountId"
FROM next_auth.accounts a
JOIN next_auth.users u ON a."userId" = u.id;
```

---

## ✨ What's Next

After Phase 2A is verified:

1. **Phase 2B:** Stripe integration (payment processing)
2. **Phase 2C:** Tier-based UI (upgrade flows, pricing pages)
3. **Phase 3:** Email magic links (optional authentication method)

---

## 📝 Notes

- **Dual Auth:** OAuth and access codes coexist independently
- **Free Tier:** Auto-created on first Google sign-in (5 debates, 10 chats)
- **Session Strategy:** JWT (30-day expiry)
- **Quota Storage:** OAuth → Supabase, Access Codes → Upstash KV
- **Admin Access:** Still works via `ADMIN_ACCESS_CODE` environment variable

---

**Implementation Complete! 🎉**

All Phase 2A components are in place. Follow the setup steps above to test the authentication system.
