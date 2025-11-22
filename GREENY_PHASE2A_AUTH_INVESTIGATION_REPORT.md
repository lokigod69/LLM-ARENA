# 🔍 GREENY PHASE 2A AUTH INVESTIGATION REPORT

**Date:** November 22, 2025  
**Investigator:** Cascade (Windsurf AI Agent)  
**For:** Claude (Strategic Partner) & Saya (Project Lead)  
**Status:** ✅ INVESTIGATION COMPLETE

---

## 📊 EXECUTIVE SUMMARY

Phase 2A authentication investigation complete. Analysis of NextAuth.js v5 requirements, Supabase schema design, and integration with existing access code system.

**Key Findings:**
- ✅ NextAuth.js v5 (Auth.js) required for Next.js 15 App Router
- ✅ Google OAuth primary authentication strategy identified
- ✅ Hybrid approach recommended: JWT sessions + Supabase user storage
- ✅ Coexistence strategy defined for access codes and OAuth
- ✅ Implementation path clear with minimal breaking changes

**Recommendation:** Proceed with JWT session strategy using NextAuth v5 + Supabase adapter for user management, maintaining backward compatibility with access code system.

---

## 2A.1 NEXTAUTH.JS RESEARCH

### Version Selection

**Answer: NextAuth.js v5 (Auth.js) ✅**

**Reasoning:**
- Next.js 15 (current project version) requires NextAuth v5 beta
- v4 is not fully compatible with App Router
- v5 is production-ready despite beta tag
- Official recommendation from NextAuth team for Next.js 14+

**Installation:**
```bash
npm install next-auth@beta @auth/supabase-adapter
```

**Current Version Analysis:**
```json
// package.json current state
{
  "next": "^15.5.6",
  "react": "^19.0.0"
}
// NextAuth v5 required for compatibility
```

### Required Files & Routes

**1. Root Configuration File** ✅ **REQUIRED**
- **Location:** `auth.ts` (project root)
- **Purpose:** Central auth configuration, exports auth functions
- **Exports:** `auth`, `handlers`, `signIn`, `signOut`

```typescript
// auth.ts structure
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { SupabaseAdapter } from "@auth/supabase-adapter"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: SupabaseAdapter({
    url: process.env.SUPABASE_URL,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }),
  session: { strategy: "jwt" },
  providers: [Google],
  callbacks: {
    // Custom callbacks for tier management
  }
})
```

**2. API Route Handler** ✅ **REQUIRED**
- **Location:** `src/app/api/auth/[...nextauth]/route.ts`
- **Purpose:** Handles all NextAuth endpoints
- **Content:** Minimal - just exports handlers

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth'
export const { GET, POST } = handlers
```

**3. Middleware (Optional but Recommended)**
- **Location:** `middleware.ts` (project root)
- **Purpose:** Protect routes, handle redirects
- **Implementation:** Uses `auth()` function from config

```typescript
// middleware.ts
export { auth as middleware } from "@/auth"

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

### Google OAuth Setup

**Requirements from Google Cloud Console:**

**Step 1: Create OAuth 2.0 Credentials**
- Navigate to: https://console.developers.google.com/apis/credentials
- Create OAuth 2.0 Client ID
- Application type: Web application

**Step 2: Configure Authorized Redirect URIs**
```
Development:
http://localhost:3000/api/auth/callback/google

Production:
https://your-domain.com/api/auth/callback/google
```

**Step 3: Obtain Credentials**
- Client ID: `xxx.apps.googleusercontent.com`
- Client Secret: `GOCSPX-xxx`

**Step 4: Configure Scopes (Default)**
- `openid`
- `email`
- `profile`

**Optional: Force Refresh Token**
```typescript
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  authorization: {
    params: {
      prompt: "consent",
      access_type: "offline",
      response_type: "code"
    }
  }
})
```

### Session Strategy Analysis

**Option A: JWT Sessions** ⭐ **RECOMMENDED**

**Pros:**
- ✅ Fast - no database lookup on every request
- ✅ Stateless - scales horizontally
- ✅ Works with Vercel edge/serverless
- ✅ No session table needed
- ✅ Built-in encryption
- ✅ Simpler implementation

**Cons:**
- ⚠️ Cannot invalidate sessions server-side (must wait for expiry)
- ⚠️ Token size limits (~4KB max for cookies)
- ⚠️ User data changes require re-login

**Option B: Database Sessions**

**Pros:**
- ✅ Can invalidate sessions server-side
- ✅ No token size limits
- ✅ Better audit trail
- ✅ Real-time user data updates

**Cons:**
- ❌ Database query on every auth check
- ❌ More complex
- ❌ Requires session table maintenance
- ❌ Higher database load

**Recommendation: JWT Sessions**

**Reasoning:**
1. **Performance:** Matrix Arena is read-heavy (debates, chats) - JWT avoids DB hits
2. **Scale:** Serverless-friendly for Vercel deployment
3. **Simplicity:** Fewer moving parts, easier debugging
4. **Free Tier:** Access codes already handle quota limits (no need for session invalidation)
5. **Upgrades:** Stripe webhooks update Supabase, next login reflects changes

**Trade-off Mitigation:**
- Store tier/quota in Supabase `users` table
- Check Supabase on critical operations (debate start, chat creation)
- JWT contains user ID only - fetch fresh data when needed
- Use reasonable session expiry (7-30 days)

---

## 2A.2 SUPABASE USER SCHEMA DESIGN

### Database Adapter Selection

**Answer: @auth/supabase-adapter ✅**

**Installation:**
```bash
npm install @auth/supabase-adapter
# (Note: @supabase/supabase-js already installed)
```

**Adapter vs Native Supabase Auth:**
- NextAuth adapter stores auth data in Supabase but manages auth logic
- Supabase Auth is separate product (not using)
- Adapter uses `next_auth` schema (isolated from app data)

### Required Tables (Auto-Created by Adapter)

**Schema: `next_auth`** (separate from public schema)

**1. Users Table**
```sql
CREATE TABLE IF NOT EXISTS next_auth.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text,
  email text,
  "emailVerified" timestamp with time zone,
  image text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT email_unique UNIQUE (email)
);
```

**2. Accounts Table** (OAuth providers)
```sql
CREATE TABLE IF NOT EXISTS next_auth.accounts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
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
  "userId" uuid,
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT provider_unique UNIQUE (provider, "providerAccountId"),
  CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") 
    REFERENCES next_auth.users (id) ON DELETE CASCADE
);
```

**3. Sessions Table** (if using database sessions)
```sql
CREATE TABLE IF NOT EXISTS next_auth.sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  expires timestamp with time zone NOT NULL,
  "sessionToken" text NOT NULL,
  "userId" uuid,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessionToken_unique UNIQUE ("sessionToken"),
  CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") 
    REFERENCES next_auth.users (id) ON DELETE CASCADE
);
```
**Note:** Not needed if using JWT sessions (recommended)

**4. Verification Tokens Table**
```sql
CREATE TABLE IF NOT EXISTS next_auth.verification_tokens (
  identifier text,
  token text,
  expires timestamp with time zone NOT NULL,
  CONSTRAINT verification_tokens_pkey PRIMARY KEY (token),
  CONSTRAINT token_unique UNIQUE (token),
  CONSTRAINT token_identifier_unique UNIQUE (token, identifier)
);
```

### Extended Schema for Matrix Arena (Public Schema)

**Proposal: Add tier management to users table**

**Option A: Extend next_auth.users (Not Recommended)**
- Adapter may overwrite custom fields

**Option B: Separate user_profiles table** ⭐ **RECOMMENDED**
```sql
-- Public schema, links to NextAuth users
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY, -- Same ID as next_auth.users
  email varchar(255) NOT NULL,
  tier varchar(20) DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro')),
  debates_remaining integer DEFAULT 5,
  chats_remaining integer DEFAULT 10,
  stripe_customer_id varchar(255) UNIQUE,
  created_at timestamp DEFAULT NOW(),
  updated_at timestamp DEFAULT NOW(),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) 
    REFERENCES next_auth.users (id) ON DELETE CASCADE
);

CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_stripe ON public.user_profiles(stripe_customer_id);
CREATE INDEX idx_user_profiles_tier ON public.user_profiles(tier);
```

**Reasoning:**
- Clean separation: auth data vs app data
- NextAuth adapter won't touch public schema
- Easy to query for tier/quota management
- Foreign key ensures referential integrity

### Auto-Create Profile Trigger

```sql
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, tier, debates_remaining, chats_remaining)
  VALUES (NEW.id, NEW.email, 'free', 5, 10);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_created
  AFTER INSERT ON next_auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();
```

### Migration Strategy

**Method 1: SQL Editor (Recommended for Initial Setup)**
1. Copy NextAuth schema SQL from adapter docs
2. Run in Supabase SQL Editor
3. Add custom `user_profiles` table
4. Add trigger for auto-profile creation
5. Expose `next_auth` schema in API settings

**Method 2: Supabase CLI Migration**
```bash
# Create migration
supabase migration new nextauth_setup

# Edit migration file with SQL
# Then apply
supabase db push
```

**Schema Exposure:**
- Dashboard → Settings → API → Exposed schemas
- Add `next_auth` to list
- Allows PostgREST API access (if needed)

---

## 2A.3 INTEGRATION POINTS ANALYSIS

### Current Authentication System

**Existing Implementation:**
```typescript
// Cookie-based access code auth
// Files: src/app/api/auth/login/route.ts
//        src/app/api/auth/verify/route.ts
//        src/components/AccessCodeModal.tsx

// Cookies set:
- access_mode: 'admin' | 'token'
- access_token: {code}

// KV Storage:
- token:{accessCode} => { queries_remaining, queries_allowed, isActive }
```

**Auth Check Pattern (Current):**
```typescript
// Every API route checks cookies
const c = await cookies();
const mode = c.get('access_mode')?.value;
const token = c.get('access_token')?.value;

if (mode === 'admin') { /* unlimited */ }
if (mode === 'token') { /* check KV for quota */ }
```

### Coexistence Strategy: Dual Auth System

**Approach:** Parallel authentication modes

**Mode 1: NextAuth (OAuth Users)** 🆕
- Google OAuth sign-in
- Session stored in JWT
- User record in Supabase
- Free tier auto-created on signup

**Mode 2: Access Codes (Beta/Legacy)** ✅ Keep
- Manual code entry (existing)
- Cookie-based (existing)
- KV storage (existing)
- Admin codes continue working

**Recommendation: Fully Separate** ⭐

**Reasoning:**
1. **Minimal Changes:** Existing access code system untouched
2. **Beta Compatibility:** Current users unaffected
3. **Gradual Migration:** Can link later if needed
4. **Testing:** Easy to test OAuth without breaking codes
5. **Flexibility:** Admin codes remain for emergency access

### API Route Protection Pattern

**New Pattern (Dual Auth):**
```typescript
import { auth } from '@/auth';

export async function POST(req: Request) {
  // Try NextAuth first
  const session = await auth();
  
  if (session?.user) {
    // OAuth user - check Supabase tier
    const userId = session.user.id;
    const profile = await supabase
      .from('user_profiles')
      .select('tier, debates_remaining')
      .eq('id', userId)
      .single();
    
    if (profile.debates_remaining <= 0) {
      return NextResponse.json({ error: 'Quota exceeded' }, { status: 403 });
    }
    // Proceed and decrement
  } else {
    // Fallback to access code check (existing)
    const c = await cookies();
    const mode = c.get('access_mode')?.value;
    // ... existing logic
  }
}
```

**Utility Function:**
```typescript
// src/lib/auth-helpers.ts (NEW)
export async function getUserAuth() {
  // Check NextAuth session
  const session = await auth();
  if (session?.user) {
    return { 
      type: 'oauth' as const, 
      userId: session.user.id,
      email: session.user.email 
    };
  }
  
  // Check access code cookies
  const c = await cookies();
  const mode = c.get('access_mode')?.value;
  const token = c.get('access_token')?.value;
  
  if (mode === 'admin') return { type: 'admin' as const };
  if (mode === 'token' && token) return { type: 'token' as const, token };
  
  return null;
}
```

### Client-Side Session Access

**NextAuth provides:**
```typescript
// Client components
'use client'
import { useSession } from 'next-auth/react'

function MyComponent() {
  const { data: session, status } = useSession()
  
  if (status === 'loading') return <div>Loading...</div>
  if (status === 'unauthenticated') return <SignInButton />
  
  return <div>Tier: {session.user.tier}</div>
}
```

**SessionProvider wrapper needed:**
```typescript
// src/app/layout.tsx
import { SessionProvider } from 'next-auth/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

### AccessCodeModal Integration

**Proposed Update:**
```typescript
// Add Google OAuth button at top
import { signIn } from 'next-auth/react'

export default function AccessCodeModal({ onVerified }) {
  return (
    <div className="modal">
      <h2>ACCESS REQUIRED</h2>
      
      {/* NEW: OAuth option */}
      <button onClick={() => signIn('google', { callbackUrl: '/' })}>
        🔐 Sign in with Google
      </button>
      
      <div className="divider">OR</div>
      
      {/* EXISTING: Code input */}
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="test-xxxxxxxx" />
        <button type="submit">UNLOCK</button>
      </form>
    </div>
  )
}
```

---

## 2A.4 ENVIRONMENT VARIABLES

### Required Variables (New)

```bash
# NextAuth Core
AUTH_SECRET=your_random_secret_here          # Required: JWT signing (generate with openssl)
NEXTAUTH_URL=http://localhost:3000           # Dev URL
# NEXTAUTH_URL=https://your-domain.com       # Production URL (set in Vercel)

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# Supabase (UPDATED - SERVICE_ROLE_KEY needed for adapter)
SUPABASE_URL=https://xxx.supabase.co         # Server-side (for adapter)
SUPABASE_SERVICE_ROLE_KEY=eyJ...             # NEW: Required for adapter
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co  # Client-side
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...         # Client-side
```

### Generation Commands

```bash
# Generate AUTH_SECRET
openssl rand -hex 32
# Or
openssl rand -base64 32
```

### Updated .env.local.example

**Add these sections:**
```bash
# === REQUIRED: NextAuth Authentication ===
# Generate with: openssl rand -hex 32
AUTH_SECRET=your_random_secret_here

# Development
NEXTAUTH_URL=http://localhost:3000

# Production (set in Vercel)
# NEXTAUTH_URL=https://your-domain.com

# === REQUIRED: Google OAuth ===
# Get from: https://console.developers.google.com/apis/credentials
# Redirect URI: http://localhost:3000/api/auth/callback/google
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# === UPDATED: Supabase (now includes SERVICE_ROLE_KEY) ===
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # NEW: Required for NextAuth adapter

# Existing Supabase vars (keep)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Important:** `SUPABASE_SERVICE_ROLE_KEY` is new requirement for adapter

---

## 2A.5 UI COMPONENTS NEEDED

### Components to Create

**1. UserMenu.tsx** 🆕 **NEW**

**Location:** `src/components/UserMenu.tsx`

**Purpose:** Logged-in user dropdown

**Features:**
- User avatar (from Google)
- Email display
- Current tier badge
- Queries remaining
- Upgrade button (if not Pro)
- Sign Out button

**Mockup:**
```
┌────────────────┐
│  👤 user@...   │
│  Tier: Free    │
│  5 debates left│
│  ──────────    │
│  [Upgrade]     │
│  [Sign Out]    │
└────────────────┘
```

**2. SignInButton.tsx** 🆕 **NEW**

**Location:** `src/components/SignInButton.tsx`

**Purpose:** Trigger auth modal

**Simple button that opens AccessCodeModal with OAuth option**

**3. AccessCodeModal.tsx** ✏️ **MODIFY**

**Current:** `src/components/AccessCodeModal.tsx`

**Changes:**
- Add "Sign in with Google" button at top
- Add divider: "── OR ──"
- Keep existing access code input below
- Both options in same modal

**Updated UI:**
```
┌─────────────────────────────┐
│     ACCESS REQUIRED         │
│                             │
│  ┌─────────────────────┐   │
│  │ 🔐 Sign in with     │   │
│  │    Google            │   │
│  └─────────────────────┘   │
│                             │
│  ────────── OR ──────────   │
│                             │
│  Enter Access Code:         │
│  ┌─────────────────────┐   │
│  │  test-xxxxxxxx       │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │      UNLOCK          │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

**4. Header.tsx** 🆕 **NEW** (Optional)

**Location:** `src/components/Header.tsx`

**Purpose:** Top navigation bar

**Features:**
- App title/logo (left)
- Query count display (right)
- UserMenu or SignInButton (right)

**Minimal implementation for Phase 2A**

### Existing Components - No Changes Required

**Keep as-is:**
- `AdminPanel.tsx` - Works independently
- `ControlPanel.tsx` - Debate controls
- `ChatColumn.tsx` - Debate display
- `TokenMeter.tsx` - Token tracking
- All persona/model selectors
- All debate logic components

**Reasoning:** OAuth is parallel system, doesn't break existing features

---

## 📋 IMPLEMENTATION PLAN

### Phase 2A Implementation (After Approval)

**Total Estimated Time:** 5-6 hours

### Step 1: Install NextAuth & Dependencies (15 min)
```bash
npm install next-auth@beta @auth/supabase-adapter
```

### Step 2: Create Supabase Schema (45 min)
1. Copy NextAuth adapter SQL
2. Run in Supabase SQL Editor
3. Add `user_profiles` table
4. Add auto-profile trigger
5. Expose `next_auth` schema in settings
6. Test tables created

### Step 3: Create Auth Configuration (45 min)
1. Create `auth.ts` in project root
2. Configure Google OAuth provider
3. Set up Supabase adapter
4. Configure JWT session strategy
5. Add custom callbacks for user_profiles
6. Test basic export

### Step 4: Create API Route (15 min)
1. Create `src/app/api/auth/[...nextauth]/route.ts`
2. Export GET, POST handlers
3. Test endpoints respond

### Step 5: Environment Variables (20 min)
1. Update `.env.local.example`
2. Generate `AUTH_SECRET`
3. Document Google OAuth setup steps
4. Add placeholder for secrets

### Step 6: Google OAuth Setup (30 min)
1. Create OAuth credentials in Google Cloud Console
2. Configure redirect URIs
3. Obtain Client ID and Secret
4. Add to `.env.local`
5. Test OAuth flow

### Step 7: Update Root Layout (15 min)
1. Import `SessionProvider` from next-auth/react
2. Wrap app (alongside existing AuthProvider)
3. Test both providers coexist

### Step 8: Create Auth Helper Utilities (30 min)
1. Create `src/lib/auth-helpers.ts`
2. Implement `getUserAuth()` dual check
3. Implement `checkUserQuota()` for OAuth users
4. Implement `decrementQuota()` for OAuth users

### Step 9: Update API Routes (1 hour)
1. Update `/api/debate/step/route.ts`
2. Update `/api/chat/message/route.ts`
3. Add dual auth checks
4. Test both access modes work

### Step 10: Create UI Components (1.5 hours)
1. Create `UserMenu.tsx` (30 min)
2. Create `SignInButton.tsx` (15 min)
3. Update `AccessCodeModal.tsx` with OAuth option (30 min)
4. Optional: Create `Header.tsx` (15 min)
5. Apply Matrix theme styling (20 min)

### Step 11: Testing (30 min)
1. Test Google OAuth sign-in flow
2. Test free tier auto-creation
3. Test quota checks for OAuth users
4. Test access code flow still works
5. Test admin mode still works
6. Test both auth modes are independent

---

## ⏱️ TIME ESTIMATES

| Task | Time | Complexity |
|------|------|------------|
| Install dependencies | 15 min | Low |
| Supabase schema | 45 min | Medium |
| Auth configuration | 45 min | Medium |
| API route | 15 min | Low |
| Environment variables | 20 min | Low |
| Google OAuth setup | 30 min | Medium |
| Update layout | 15 min | Low |
| Auth helpers | 30 min | Medium |
| Update API routes | 1 hour | Medium |
| UI components | 1.5 hours | Medium |
| Testing | 30 min | Medium |
| **Total Investigation** | **~3 hours** | **Completed ✅** |
| **Total Implementation** | **~5-6 hours** | **Pending approval** |

---

## ⚠️ RISKS & CONSIDERATIONS

### Risk 1: Dual Auth Complexity
**Issue:** Managing two parallel auth systems
**Mitigation:**
- Clear utility functions abstract the complexity
- Documented patterns for API routes
- Tests verify both modes work independently
- Can consolidate later if needed

### Risk 2: Session Callbacks for Extended Data
**Issue:** JWT needs tier/quota data from user_profiles
**Mitigation:**
- Use NextAuth callbacks to extend session object
- Fetch from Supabase on sign-in, cache in JWT
- Re-fetch on critical operations (debate start)
- Document callback patterns clearly

```typescript
// auth.ts callbacks
callbacks: {
  async session({ session, token }) {
    if (token.sub) {
      const profile = await supabase
        .from('user_profiles')
        .select('tier, debates_remaining, chats_remaining')
        .eq('id', token.sub)
        .single();
      
      session.user.tier = profile.data?.tier;
      session.user.debatesRemaining = profile.data?.debates_remaining;
      session.user.chatsRemaining = profile.data?.chats_remaining;
    }
    return session;
  }
}
```

### Risk 3: Google OAuth Configuration
**Issue:** Redirect URI mismatches cause OAuth failures
**Mitigation:**
- Document exact URIs needed (dev + prod)
- Test in development before production
- Clear error messages for common issues
- Include troubleshooting guide

### Risk 4: Supabase SERVICE_ROLE_KEY Security
**Issue:** Service role key has admin access
**Mitigation:**
- Only use server-side (never expose to client)
- Environment variable only
- Row Level Security (RLS) on user_profiles
- Regular security audits

### Risk 5: Access Code Migration Path
**Issue:** Beta users on access codes may want OAuth accounts
**Mitigation:**
- Phase 2A: Keep systems separate
- Phase 3: Add "Link Access Code" feature (optional)
- No forced migration required
- Users choose when to switch

---

## ❓ QUESTIONS FOR SAYA

### Q1: Free Tier Email Requirement
**Options:**
- [ ] **Option A:** Free tier requires Google OAuth signup (email collected)
- [ ] **Option B:** Free tier allows anonymous use + access codes (current)
- [ ] **Option C:** Both: OAuth for new users, access codes for beta

**Recommendation:** Option C (hybrid) - gives users choice

### Q2: Access Code Sunset Plan
- Should access codes be phased out eventually?
- Or keep indefinitely for special cases?
- Timeline for migration (if any)?

**Recommendation:** Keep access codes indefinitely for:
- Beta testers (grandfather clause)
- Admin access (backup auth)
- Testing/demo accounts
- Special partnerships

### Q3: Email Magic Links (Future)
- Include in Phase 2A or defer to later?
- Requires email sending infrastructure

**Recommendation:** Defer to Phase 3 - Google OAuth sufficient for MVP

### Q4: Profile Page / Dashboard
- Create user profile page in Phase 2A?
- Or defer until Stripe integration (Phase 2B)?

**Recommendation:** Defer to Phase 2C (tier-based UI) - show in minimal header for now

### Q5: Middleware for Route Protection
- Implement auth middleware now?
- Or keep manual checks in API routes?

**Recommendation:** Manual checks for now - middleware in Phase 3 when route structure solidifies

---

## ✅ RECOMMENDATIONS SUMMARY

### Schema: Hybrid Approach
- **NextAuth tables:** `next_auth` schema (auto-created by adapter)
- **Extended data:** `public.user_profiles` table (manual)
- **Link:** Foreign key on user ID
- **Auto-creation:** Trigger creates free tier profile on signup

### Session Strategy: JWT
- **Fast:** No database hit on every request
- **Scalable:** Serverless-friendly
- **Simple:** Less moving parts
- **Tradeoff:** Fetch fresh data on critical operations

### Coexistence: Fully Separate
- **OAuth:** NextAuth + Supabase (new users)
- **Access Codes:** Cookie + KV (existing users)
- **Check Order:** Try OAuth first, fallback to codes
- **Migration:** Optional, user-initiated (future)

### Implementation Priority:
1. Install NextAuth + Supabase schema
2. Auth config + API route
3. Environment variables + Google OAuth
4. Auth helper utilities
5. Update API routes with dual checks
6. UI components (minimal)
7. Testing both flows

---

## 🚦 READY FOR APPROVAL

**Status:** ✅ **INVESTIGATION COMPLETE**

**Next Steps:**
1. Review this report with Saya
2. Answer questions above
3. Approve recommendations
4. Proceed to Phase 2A Implementation

**Estimated Implementation Time:** 5-6 hours after approval

**Dependencies:**
- Google Cloud account (for OAuth credentials)
- Supabase access (database admin)
- Approval for dual auth approach

---

## 📌 KEY DECISIONS MADE

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| **NextAuth Version** | v5 (beta) | Required for Next.js 15 App Router |
| **Session Strategy** | JWT | Performance, scalability, simplicity |
| **Database Adapter** | @auth/supabase-adapter | Already using Supabase |
| **OAuth Provider** | Google (primary) | Most universal, easy setup |
| **Schema Design** | Separate user_profiles table | Clean separation, adapter-safe |
| **Auth Coexistence** | Fully separate (parallel) | Minimal changes, backward compatible |
| **Free Tier** | Auto-created on signup | 5 debates, 10 chats (per instructions) |
| **Access Codes** | Keep unchanged | Beta testers, admin, testing |

---

## 🔄 PHASE 2 TIMELINE UPDATED

```
Phase 2A: Auth Investigation    ← COMPLETE ✅
    ↓
Phase 2A: Auth Implementation   (~5-6 hours) ← PENDING APPROVAL
    ↓
Phase 2B: Stripe Implementation (~8-9 hours, uses auth)
    ↓
Phase 2C: Tier-Based UI         (~3-4 hours)
    ↓
Phase 3: Onboarding & Polish    (design TBD)
```

---

**Investigation Status:** ✅ COMPLETE  
**Report Date:** November 22, 2025  
**Next Action:** Await approval to proceed to Phase 2A Implementation

---

*Thank you for reviewing this investigation report. Ready to implement authentication once approved!* 🚀
