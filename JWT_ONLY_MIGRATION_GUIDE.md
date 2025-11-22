# JWT-Only Authentication Migration Guide

## What Changed

**Old Approach (❌ Had Issues):**
- Used `@auth/supabase-adapter` 
- Required `next_auth` schema with multiple tables
- AdapterError due to missing verification_tokens table
- More complex setup

**New Approach (✅ Simpler & Working):**
- Pure JWT sessions (no database adapter)
- Manual user management via callbacks
- Only one table needed: `public.user_profiles`
- Full control over user creation/updates

---

## Migration Steps

### Step 1: Run Simplified Migration

1. Open Supabase Dashboard → SQL Editor
2. Copy content from `supabase_jwt_only_migration.sql`
3. Paste and run

**What it creates:**
- ✅ `public.user_profiles` table (email, name, image, tier, quotas)
- ✅ Auto-update trigger for `updated_at`
- ✅ Row Level Security policies
- ✅ Indexes for performance

**What it DOESN'T need:**
- ❌ `next_auth` schema (removed)
- ❌ `next_auth.users` table (removed)
- ❌ `next_auth.accounts` table (removed)
- ❌ `next_auth.verification_tokens` table (removed)

### Step 2: Verify Table Structure

Run this in Supabase SQL Editor:

```sql
-- Check table exists
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- View table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` (uuid, primary key)
- `email` (text, unique, not null)
- `name` (text, nullable)
- `image` (text, nullable)
- `tier` (text, default 'free')
- `debates_remaining` (integer, default 5)
- `chats_remaining` (integer, default 10)
- `stripe_customer_id` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Step 3: Remove Old Schema (If Exists)

If you previously ran `supabase_nextauth_migration.sql`, clean it up:

```sql
-- Drop old next_auth schema (optional - won't hurt to leave it)
DROP SCHEMA IF EXISTS next_auth CASCADE;
```

### Step 4: Restart Dev Server

```bash
npm run dev
```

Watch console for:
```
🔐 AUTH CONFIG: Environment variables check:
  ✓ SUPABASE_URL: ✓ Set
  ✓ SUPABASE_SERVICE_ROLE_KEY: ✓ Set
  ✓ GOOGLE_CLIENT_ID: ✓ Set
  ✓ GOOGLE_CLIENT_SECRET: ✓ Set
  ✓ AUTH_SECRET: ✓ Set
🔗 AUTH CONFIG: Creating Supabase client...
✓ Supabase client created successfully (JWT-only mode)
⚙️  AUTH CONFIG: Initializing NextAuth...
✅ NextAuth configuration complete
```

---

## How It Works Now

### 1. User Signs In with Google

**Flow:**
```
User clicks "Sign in with Google"
  ↓
Redirects to Google OAuth
  ↓
User approves
  ↓
Google redirects back to /api/auth/callback/google
  ↓
NextAuth signIn callback triggered
  ↓
Check if user exists in public.user_profiles (by email)
  ↓
If new: INSERT user with free tier (5 debates, 10 chats)
If existing: UPDATE updated_at timestamp
  ↓
JWT token created with user profile data
  ↓
Session established (stored in cookie)
```

### 2. User Makes Authenticated Request

**Flow:**
```
Client sends request to /api/debate/step
  ↓
getUserAuth() checks NextAuth session (JWT)
  ↓
If session exists: Extract user data from JWT
  ↓
Check quota in public.user_profiles
  ↓
Decrement quota if allowed
  ↓
Process debate
```

### 3. Logging You'll See

**On first sign-in:**
```
🚪 Sign-in callback triggered: { provider: 'google', email: 'user@gmail.com' }
📧 Google profile received: { id: '...', email: '...', name: '...', picture: '...' }
👤 Creating new user profile for: user@gmail.com
✅ User profile created successfully
🔑 JWT Callback triggered: { hasUser: true, trigger: undefined, provider: 'google' }
👤 New user sign-in, fetching profile for: user@gmail.com
✓ User profile loaded: { tier: 'free', debates: 5 }
📋 Session callback: { hasUser: true, tokenId: 'abc-123-...', tier: 'free' }
```

**On subsequent sign-ins:**
```
🚪 Sign-in callback triggered: { provider: 'google', email: 'user@gmail.com' }
✓ User already exists: user@gmail.com
🔑 JWT Callback triggered: { hasUser: true }
✓ User profile loaded: { tier: 'free', debates: 3 }
```

---

## Testing

### Test 1: New User Sign-In

1. Sign in with Google (use an email not in database)
2. Check server logs for "Creating new user profile"
3. Verify in Supabase:
   ```sql
   SELECT * FROM public.user_profiles WHERE email = 'your-email@gmail.com';
   ```
4. Should show: tier='free', debates_remaining=5, chats_remaining=10

### Test 2: Existing User Sign-In

1. Sign out
2. Sign in again with same account
3. Check server logs for "User already exists"
4. Verify `updated_at` changed in Supabase

### Test 3: Quota Decrement

1. Sign in
2. Start a debate
3. Check server logs for quota decrement
4. Verify in Supabase:
   ```sql
   SELECT debates_remaining FROM public.user_profiles WHERE email = 'your-email@gmail.com';
   ```
5. Should be 4 (decremented from 5)

### Test 4: Session Persistence

1. Sign in
2. Refresh page
3. Session should persist (JWT in cookie)
4. Check browser DevTools → Application → Cookies
5. Look for `authjs.session-token`

---

## Troubleshooting

### Issue: User not created in database

**Check:**
1. Server logs show "Sign-in callback triggered"?
2. Any errors like "Failed to create user profile"?
3. Supabase RLS policies might be blocking inserts

**Fix:**
```sql
-- Temporarily disable RLS to test
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Try signing in again

-- Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
```

### Issue: "Failed to fetch user profile"

**Check:**
1. Table exists: `SELECT * FROM public.user_profiles;`
2. Service role key is correct in `.env.local`
3. Column names match exactly (debates_remaining, not debatesRemaining)

### Issue: Session not persisting

**Check:**
1. `AUTH_SECRET` is set in `.env.local`
2. Cookie is being set (check DevTools)
3. `NEXTAUTH_URL` matches your actual URL

---

## Benefits of JWT-Only Approach

✅ **Simpler Setup**
- One table instead of 4
- No adapter dependency
- Less can go wrong

✅ **Full Control**
- Manual user creation logic
- Custom fields without adapter constraints
- Easy to extend

✅ **Better Performance**
- No database lookup on every request
- JWT verified locally
- Only query DB when needed (quota checks)

✅ **Serverless Friendly**
- Stateless authentication
- No session table to manage
- Works perfectly on Vercel Edge

✅ **Easier Debugging**
- Clear logging at each step
- See exactly what's happening
- Simple callback flow

---

## Key Files Updated

### `auth.ts`
- ❌ Removed: `@auth/supabase-adapter` import
- ❌ Removed: `SupabaseAdapter()` configuration
- ✅ Added: Manual user creation in `signIn` callback
- ✅ Added: Fetch profile by email (not ID)
- ✅ Added: Comprehensive logging

### `supabase_jwt_only_migration.sql`
- ✅ New: Simplified migration
- ✅ Only creates `public.user_profiles`
- ✅ RLS policies for security
- ✅ Auto-update trigger

### No Changes Needed:
- `src/lib/auth-helpers.ts` - Works with JWT session
- `src/components/*` - No changes needed
- API routes - Already support dual auth

---

## Next Steps

After migration is complete:

1. ✅ Test Google OAuth sign-in
2. ✅ Verify user created in database
3. ✅ Test debate with quota decrement
4. ✅ Test sign-out and sign-in again
5. 🎯 Ready for production!

---

## Migration Complete! 🎉

The JWT-only approach is now active. All users will be tracked in `public.user_profiles` with manual management via NextAuth callbacks.

No more adapter errors, full control, simpler setup.
