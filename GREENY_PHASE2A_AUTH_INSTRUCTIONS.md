# 🟢 GREENY: PHASE 2A - AUTHENTICATION INVESTIGATION

**From:** Claude (Strategic Partner)  
**To:** Greeny (Cursor Coding Agent)  
**Date:** November 22, 2025  
**Status:** ✅ PAYMENT INVESTIGATION APPROVED — NOW INVESTIGATE AUTH

---

## 📊 PAYMENT INVESTIGATION REVIEW

**Verdict:** Excellent work on the Stripe investigation. Approved:
- ✅ Hybrid approach (KV for tokens, Supabase for subscriptions)
- ✅ Free tier requires email signup
- ✅ Keep access codes for beta testers (backward compatibility)
- ✅ Model routing by tier

**HOWEVER:** We've identified a dependency issue.

---

## 🔗 THE DEPENDENCY CHAIN

```
Authentication ──► Stripe ──► Tier-Based UI
     │                │              │
     │                │              └── Hide features by tier
     │                │
     │                └── Link payment to user account
     │
     └── User accounts needed for free tier
```

**Problem:** Stripe integration requires user identity to link `customer_id` to something.

**Solution:** Implement authentication FIRST, then Stripe.

---

## 🎯 PHASE 2A: AUTHENTICATION

### Overview

We need a user account system that:
1. Allows Google OAuth signup/login
2. Optionally allows email magic links
3. Creates user record in Supabase
4. Auto-creates free tier on signup (5 debates, 10 chats)
5. Coexists with existing access code system (for beta testers)

### Business Requirements

| Feature | Requirement |
|---------|-------------|
| **Google OAuth** | ✅ Required (primary) |
| **Email Magic Links** | ⚠️ Optional (nice to have) |
| **Discord/GitHub** | ❌ Not needed |
| **Password Auth** | ❌ Not needed |
| **User Profile** | ✅ Basic (name, email, avatar) |
| **Coexist with Access Codes** | ✅ Required (beta testers) |

### User Flow

**New User (Post-Beta):**
```
1. Visit site → See "Get Started" button
2. Click "Get Started" → Modal with Google OAuth
3. Sign in with Google → Create account
4. Auto-create free tier (5 debates, 10 chats)
5. Enter app with free tier access
```

**Beta Tester (Current):**
```
1. Visit site → See "Enter Access Code" option
2. Enter code → Bypass auth entirely
3. Use app with access code limits
```

**Returning User:**
```
1. Visit site → Already logged in (cookie/session)
2. Enter app directly
```

**Upgrade Flow:**
```
1. Free user clicks "Upgrade" 
2. Stripe checkout (links to their user account)
3. Return with upgraded tier
```

---

## 📋 INVESTIGATION TASKS

### Task 2A.1: NextAuth.js Research
**Deliverable:** Understanding of NextAuth setup in Next.js App Router

**Research:**
```
1. NextAuth.js v5 (Auth.js) vs v4?
   - Which version for Next.js 14+ App Router?
   - Installation: npm install next-auth@beta? or stable?

2. Required files/routes?
   - Where does auth config live in App Router?
   - /api/auth/[...nextauth]/route.ts?
   - Auth middleware?

3. Google OAuth setup?
   - What do we need from Google Cloud Console?
   - Client ID / Client Secret
   - Redirect URIs

4. Session strategy?
   - JWT vs Database sessions?
   - Which is better for our case?

5. Database adapter?
   - @auth/supabase-adapter?
   - Or custom Supabase integration?
```

### Task 2A.2: Supabase User Schema Design
**Deliverable:** Schema for user accounts that works with auth

**Design:**
```sql
-- Users table (may be auto-created by NextAuth adapter)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  image VARCHAR(500), -- Avatar URL from Google
  tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro')),
  debates_remaining INTEGER DEFAULT 5,
  chats_remaining INTEGER DEFAULT 10,
  stripe_customer_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table (if using database sessions)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL
);

-- Accounts table (OAuth providers)
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(255) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER,
  UNIQUE(provider, provider_account_id)
);
```

**Questions:**
- Does NextAuth adapter auto-create these tables?
- Or do we need manual migration?

### Task 2A.3: Integration Points Analysis
**Deliverable:** How auth integrates with existing code

**Analyze:**
```
1. AccessCodeModal coexistence:
   - How to show "Sign In" vs "Enter Code" options?
   - Should code entry bypass auth entirely?
   - Or should code link to user account?

2. API route protection:
   - How to check auth in API routes?
   - getServerSession() or getToken()?
   - Fallback to access code if not authenticated?

3. Client-side session:
   - useSession() hook from next-auth/react
   - How to check tier on client?
   - How to show/hide UI based on tier?

4. Middleware:
   - Protected routes (which pages require auth?)
   - Public routes (home page?)
   - Beta mode (access code bypasses auth)
```

### Task 2A.4: Environment Variables
**Deliverable:** List of required env vars for auth

**Expected:**
```bash
# NextAuth
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000  # or production URL

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

### Task 2A.5: UI Components Needed
**Deliverable:** List of components to create/modify

**Expected:**
```
1. SignInModal.tsx (NEW)
   - Google OAuth button
   - Optional: Email input for magic link
   - "Or enter access code" link

2. UserMenu.tsx (NEW)
   - Avatar dropdown
   - "Signed in as [email]"
   - Current tier display
   - "Upgrade" button (if free/basic)
   - "Sign Out" button

3. AccessCodeModal.tsx (MODIFY)
   - Add "Sign In with Google" option
   - Keep access code entry
   - Handle both flows

4. Header updates
   - Show UserMenu when logged in
   - Show "Sign In" when not logged in
   - Keep queries display
```

---

## 📝 INVESTIGATION REPORT TEMPLATE

**Create:** `GREENY_PHASE2A_AUTH_INVESTIGATION_REPORT.md`

```markdown
# 🔍 GREENY PHASE 2A AUTH INVESTIGATION REPORT

## NextAuth.js Setup
- Version: [v4 or v5?]
- Installation: [command]
- Config location: [path]
- Required files: [list]

## Google OAuth Requirements
- Google Cloud Console setup: [steps]
- Redirect URIs needed: [list]
- Scopes needed: [list]

## Session Strategy
- Recommended: [JWT or Database]
- Reasoning: [why]

## Database Schema
- Adapter: [which one?]
- Tables needed: [list]
- Migration: [auto or manual?]

## Integration Strategy
- Access code coexistence: [approach]
- API protection: [pattern]
- Client session: [approach]

## Environment Variables
- [list all needed]

## Components Needed
- New: [list]
- Modified: [list]

## Implementation Plan
1. [step]
2. [step]
...

## Time Estimate
- Total: [hours]

## Risks & Considerations
- [list any concerns]

## Questions for Saya
- [any remaining decisions]
```

---

## ⏱️ TIME ESTIMATE

| Task | Time |
|------|------|
| 2A.1 NextAuth research | 1 hour |
| 2A.2 Schema design | 30 min |
| 2A.3 Integration analysis | 1 hour |
| 2A.4 Env vars | 15 min |
| 2A.5 UI components | 30 min |
| **Total Investigation** | **~3 hours** |

---

## 🚦 GO SIGNAL

**Status:** ✅ **PROCEED WITH AUTH INVESTIGATION**

After this investigation:
1. You'll share report
2. We'll review and approve
3. Then implement Auth (Phase 2A Implementation)
4. Then implement Stripe (Phase 2B Implementation)
5. Then tier-based UI (Phase 2C Implementation)

---

## 📌 KEY DECISIONS ALREADY MADE

| Decision | Answer |
|----------|--------|
| Primary auth | Google OAuth |
| Secondary auth | Email magic links (optional) |
| Password auth | No |
| Free tier on signup | Yes (5 debates, 10 chats) |
| Access codes | Keep for beta testers |
| Session storage | TBD (investigate) |
| User table location | Supabase |

---

## 🔄 OVERALL PHASE 2 TIMELINE

```
Phase 2A: Auth Investigation    ← YOU ARE HERE
    ↓
Phase 2A: Auth Implementation   (~4-6 hours)
    ↓
Phase 2B: Stripe Implementation (~8-9 hours, from your report)
    ↓
Phase 2C: Tier-Based UI         (~3-4 hours)
    ↓
Phase 3: Onboarding             (design TBD)
```

---

**Good luck with the auth investigation, Greeny! 🚀**

This is the critical foundation for everything else.
