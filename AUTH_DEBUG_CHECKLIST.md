# 🔍 Authentication Debug Checklist

## Issue: Google OAuth returns `?error=Configuration` and session not created

---

## ✅ Changes Made

1. **Fixed SupabaseAdapter configuration** - Using `{ url, secret }` format
2. **Added comprehensive logging** to `auth.ts`:
   - Environment variables validation on startup
   - Google profile callback logging
   - JWT callback logging (user sign-in, token updates)
   - Session callback logging
   - Sign-in callback logging
3. **Added cursor-pointer class** to Google sign-in button

---

## 🔧 Debug Steps

### Step 1: Check Server Console on Startup

After restarting the dev server (`npm run dev`), you should see:

```
🔐 AUTH CONFIG: Environment variables check:
  ✓ SUPABASE_URL: ✓ Set
  ✓ SUPABASE_SERVICE_ROLE_KEY: ✓ Set (eyJhbGciO...)
  ✓ GOOGLE_CLIENT_ID: ✓ Set
  ✓ GOOGLE_CLIENT_SECRET: ✓ Set
  ✓ AUTH_SECRET: ✓ Set
  ✓ NEXTAUTH_URL: http://localhost:3000
🔗 AUTH CONFIG: Creating Supabase client...
✓ Supabase client created successfully
⚙️  AUTH CONFIG: Initializing NextAuth...
✅ NextAuth configuration complete
```

**If any show "✗ MISSING":**
- Check your `.env.local` file exists
- Verify variable names match exactly (no typos)
- Restart dev server after adding variables

---

### Step 2: Check OAuth Flow Logging

When you click "Sign in with Google", watch the console for:

```
🚪 Sign-in callback triggered: { provider: 'google', userId: '...', email: '...' }
📧 Google profile received: { id: '...', email: '...', name: '...', picture: '...' }
🔑 JWT Callback triggered: { hasUser: true, trigger: undefined, provider: 'google' }
👤 New user sign-in, fetching profile for: abc-123-...
✓ User profile loaded: { tier: 'free', debates: 5 }
📋 Session callback: { hasUser: true, tokenId: 'abc-123-...', tier: 'free' }
```

**If you see "❌ Failed to fetch user profile":**
- Check if Supabase migration was run successfully
- Verify `next_auth` schema is exposed in Supabase settings
- Check if trigger `on_user_created` exists and is enabled

---

### Step 3: Common Error Causes

#### Error: `?error=Configuration`

**Likely Causes:**
1. **Missing AUTH_SECRET** - Must be set and non-empty
2. **Missing Google credentials** - CLIENT_ID and SECRET must be valid
3. **SupabaseAdapter configuration issue** - Now fixed with url/secret format
4. **NEXTAUTH_URL mismatch** - Must match your actual URL exactly

**Quick Fix:**
```bash
# Verify .env.local has all required variables:
cat .env.local | grep -E "(AUTH_SECRET|GOOGLE_CLIENT|SUPABASE_|NEXTAUTH_URL)"
```

#### Error: Profile Not Found

**If you see "⚠️ No profile found for user, will use defaults":**
- This is OK on first sign-in (defaults will be used)
- Check if trigger created the profile:
  ```sql
  SELECT * FROM public.user_profiles WHERE email = 'your-email@gmail.com';
  ```
- If no profile exists, manually create one:
  ```sql
  INSERT INTO public.user_profiles (id, email, tier, debates_remaining, chats_remaining)
  SELECT id, email, 'free', 5, 10 
  FROM next_auth.users 
  WHERE email = 'your-email@gmail.com';
  ```

#### Error: Redirect URI Mismatch (Google)

**If Google shows "redirect_uri_mismatch":**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Ensure **Authorized redirect URIs** includes EXACTLY:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - NO trailing slash
   - NO `www.`
   - Exact port number (3000)

---

### Step 4: Verify Database Schema

Run these queries in Supabase SQL Editor:

```sql
-- Check if next_auth schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'next_auth';

-- Check if tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'next_auth';

-- Check if trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'on_user_created';

-- Check if user_profiles table exists
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles';
```

**Expected Results:**
- `next_auth` schema exists
- Tables: `users`, `accounts`, `verification_tokens`
- Trigger: `on_user_created`
- Table: `user_profiles`

**If missing:**
- Re-run `supabase_nextauth_migration.sql` in Supabase SQL Editor

---

### Step 5: Verify next_auth Schema is Exposed

1. Go to Supabase Dashboard
2. Settings → API
3. Scroll to "Exposed schemas"
4. Ensure `next_auth` is in the list
5. If not, add it and click "Save"

**Why this matters:** The SupabaseAdapter needs to query tables in the `next_auth` schema.

---

### Step 6: Test with Browser DevTools

**Open Browser Console (F12) and watch for:**

1. **Network Tab:**
   - Look for `/api/auth/signin/google` - Should return 302 redirect
   - Look for `/api/auth/callback/google` - Should create session cookie
   - Check if `authjs.session-token` cookie is set

2. **Console Tab:**
   - Any JavaScript errors?
   - Any failed fetch requests?

3. **Application Tab → Cookies:**
   - Check if `authjs.session-token` exists after sign-in
   - If missing, session was not created

---

### Step 7: Manual Session Check

After attempting to sign in with Google, run this in your browser console:

```javascript
// Check if session exists
fetch('/api/auth/session')
  .then(r => r.json())
  .then(console.log)
```

**Expected Response (if signed in):**
```json
{
  "user": {
    "id": "abc-123-...",
    "name": "Your Name",
    "email": "your-email@gmail.com",
    "image": "https://...",
    "tier": "free",
    "debatesRemaining": 5,
    "chatsRemaining": 10,
    "stripeCustomerId": null
  },
  "expires": "2025-12-22T..."
}
```

**If response is `{}`:**
- Session was not created
- Check server logs for errors during OAuth callback
- Verify environment variables are loaded

---

## 🐛 Specific Issues to Check

### Issue: "Configuration Error"

**Root Cause Analysis:**
1. NextAuth.js throws `Configuration` error when:
   - `AUTH_SECRET` is missing or empty
   - Provider credentials are invalid
   - Adapter configuration is malformed (now fixed)

**Verification:**
```bash
# Check if AUTH_SECRET is set
echo $AUTH_SECRET

# If empty, generate one:
openssl rand -hex 32

# Add to .env.local:
AUTH_SECRET=<generated_value>
```

### Issue: Session Not Created After Redirect

**Root Cause Analysis:**
1. OAuth flow completed but JWT not signed
2. Adapter failed to create user in database
3. Cookie not being set (SameSite/Secure issues)

**Check Server Logs For:**
- `🔑 JWT Callback triggered` - If missing, callback never ran
- `❌ Failed to fetch user profile` - Profile fetch failed
- Any Supabase client errors

**Database Check:**
```sql
-- Check if user was created in next_auth.users
SELECT * FROM next_auth.users ORDER BY "createdAt" DESC LIMIT 1;

-- Check if account was linked
SELECT * FROM next_auth.accounts ORDER BY "createdAt" DESC LIMIT 1;
```

---

## 📝 Logging Reference

All new logging in `auth.ts` uses these emoji prefixes:

- 🔐 **AUTH CONFIG** - Environment variable validation
- 🔗 **AUTH CONFIG** - Supabase client creation
- ⚙️ **AUTH CONFIG** - NextAuth initialization
- 📧 **Google profile received** - OAuth profile data
- 🚪 **Sign-in callback** - Sign-in attempt
- 🔑 **JWT Callback** - Token creation/update
- 👤 **New user sign-in** - Fetching user profile
- ✓ **User profile loaded** - Profile successfully fetched
- ⚠️ **No profile found** - Profile missing (using defaults)
- 📋 **Session callback** - Session being created
- ❌ **Failed to...** - Error occurred
- ✅ **NextAuth configuration complete** - Setup successful

---

## 🚀 Next Steps After Debugging

Once OAuth works:

1. **Test full flow:**
   - Sign in with Google
   - Verify UserMenu appears (if integrated)
   - Start a debate
   - Check quota decrements

2. **Test edge cases:**
   - Sign out and sign in again
   - Try with different Google account
   - Check if profile persists across sessions

3. **Production preparation:**
   - Update `NEXTAUTH_URL` to production domain
   - Add production redirect URI to Google Console
   - Ensure `AUTH_SECRET` is secure (32+ chars)

---

## 📞 Still Having Issues?

If authentication still fails after checking all above:

1. **Share the server console output** when clicking "Sign in with Google"
2. **Share any error messages** from browser console
3. **Share the redirect URL** (the `?error=...` part)
4. **Verify Supabase migration** was run successfully:
   ```sql
   SELECT COUNT(*) FROM next_auth.users;
   -- Should return a count (even if 0)
   ```

---

**Key Files to Check:**
- `.env.local` - All environment variables
- `auth.ts` - Now has comprehensive logging
- Supabase SQL Editor - Run migration if not done
- Google Cloud Console - Verify redirect URI

**Quick Restart Checklist:**
1. ✓ Stop dev server
2. ✓ Verify `.env.local` has all variables
3. ✓ Run `npm run dev`
4. ✓ Check console for "✅ NextAuth configuration complete"
5. ✓ Try signing in with Google
6. ✓ Watch server console for logging
