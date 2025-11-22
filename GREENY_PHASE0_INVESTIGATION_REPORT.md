# 🔍 GREENY PHASE 0 INVESTIGATION REPORT

**Date:** November 22, 2025  
**Investigator:** Greeny (Cursor/Codex Agent)  
**For:** Claude (Strategic Partner) & Saya (Project Lead)  
**Status:** ✅ INVESTIGATION COMPLETE

---

## 📊 EXECUTIVE SUMMARY

**Overall Security Posture:** ⚠️ **MODERATE RISK** - Several critical issues need immediate attention before beta launch.

**Key Findings:**
- 🔴 **CRITICAL:** Default admin code "6969" fallback exists in 5 files
- 🟡 **HIGH:** 2 unprotected debug endpoints expose sensitive information
- 🟡 **MEDIUM:** 274 console.log statements (many contain sensitive data)
- 🟢 **GOOD:** Cookie security properly configured (httpOnly, sameSite, secure in prod)
- 🟢 **GOOD:** No Stripe code exists (clean slate for implementation)
- 🔴 **CRITICAL:** No `.env.local.example` file (deployment will fail without documentation)

---

## 0.1 SECURITY AUDIT

### Environment Variables

| Variable | Required | Has Default | Default Value | Risk Level | Used In |
|----------|----------|-------------|---------------|------------|---------|
| `ADMIN_ACCESS_CODE` | ✅ YES | ⚠️ YES | `"6969"` | 🔴 **CRITICAL** | 5 files |
| `KV_REST_API_URL` or `KV_URL` | ✅ YES | ❌ NO | N/A | 🟡 HIGH | All auth routes |
| `KV_REST_API_TOKEN` or `KV_TOKEN` | ✅ YES | ❌ NO | N/A | 🟡 HIGH | All auth routes |
| `OPENAI_API_KEY` | ✅ YES | ❌ NO | N/A | 🟡 HIGH | orchestrator.ts |
| `ANTHROPIC_API_KEY` | ✅ YES | ❌ NO | N/A | 🟡 HIGH | orchestrator.ts |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ YES | ❌ NO | N/A | 🟡 HIGH | orchestrator.ts |
| `GROK_API_KEY` | ✅ YES | ❌ NO | N/A | 🟡 HIGH | orchestrator.ts |
| `DEEPSEEK_API_KEY` | ✅ YES | ❌ NO | N/A | 🟡 HIGH | orchestrator.ts |
| `MOONSHOT_API_KEY` | ✅ YES | ❌ NO | N/A | 🟡 HIGH | orchestrator.ts |
| `OPENROUTER_API_KEY` | ✅ YES | ❌ NO | N/A | 🟡 HIGH | orchestrator.ts |
| `NEXT_PUBLIC_SUPABASE_URL` | ⚠️ OPTIONAL | ❌ NO | N/A | 🟢 LOW | Graceful degradation |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ⚠️ OPTIONAL | ❌ NO | N/A | 🟢 LOW | Graceful degradation |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ OPTIONAL | ❌ NO | N/A | 🟢 LOW | TTS cache only |
| `ELEVENLABS_API_KEY` | ⚠️ OPTIONAL | ❌ NO | N/A | 🟢 LOW | TTS feature |
| `MOCK_MODE` | ⚠️ OPTIONAL | ❌ NO | N/A | 🟢 LOW | Development only |
| `NODE_ENV` | ✅ YES | ✅ YES | `"development"` | 🟢 LOW | Cookie security |

### Hardcoded Secrets

**🔴 CRITICAL FINDING:**

**File:** `src/app/api/auth/login/route.ts` (line 65)
```typescript
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || "6969";
```

**Also found in:**
1. `src/app/api/verify-code/route.ts` (line 45)
2. `src/app/api/admin/generate-codes/route.ts` (line 39)
3. `src/app/api/admin/toggle-tts/route.ts` (line 35)
4. `src/app/api/debug-env/route.ts` (line 42)

**Impact:** If `ADMIN_ACCESS_CODE` is not set in production, anyone can gain admin access with code "6969".

**Additional Security Concerns:**
- ❌ No startup validation to ensure required env vars are set
- ⚠️ Warnings logged but execution continues with insecure defaults
- ⚠️ `src/app/api/auth/login/route.ts` line 56 logs actual access codes (temporary debug code)

### Cookie Security

**✅ PROPERLY CONFIGURED:**

**File:** `src/app/api/auth/login/route.ts` (lines 74-75, 123-124)

```typescript
const isProd = process.env.NODE_ENV === 'production';
const opts = { 
  httpOnly: true,           // ✅ Prevents XSS attacks
  sameSite: 'lax' as const, // ✅ CSRF protection
  secure: isProd,           // ✅ HTTPS-only in production
  path: '/'                 // ✅ Available site-wide
};
```

**Cookies Set:**
- `access_mode`: 'admin' | 'token'
- `access_token`: Token value (only for token mode)

**Security Assessment:** ✅ **EXCELLENT** - Follows best practices

### Admin & Debug Endpoints

| Endpoint | Current Protection | Exposes Sensitive Data | Recommendation |
|----------|-------------------|----------------------|----------------|
| `/api/debug-env` | ❌ **NONE** | ✅ YES (env var previews) | 🔴 **REMOVE or PROTECT** |
| `/api/debug/personality` | ❌ **NONE** | ❌ NO (system prompts only) | 🟡 **PROTECT or DISABLE** |
| `/api/admin/generate-codes` | ✅ Admin code | ❌ NO | ✅ **GOOD** |
| `/api/admin/disable-code` | ✅ Admin code | ❌ NO | ✅ **GOOD** |
| `/api/admin/toggle-tts` | ✅ Admin code | ❌ NO | ✅ **GOOD** |
| `/api/admin/tts-status` | ❌ **NONE** | ⚠️ MINOR (TTS enabled status) | 🟡 **PROTECT** |

**🔴 CRITICAL ISSUE: `/api/debug-env`**

**File:** `src/app/api/debug-env/route.ts`

This endpoint is **completely unprotected** and exposes:
- Environment variable names
- Character lengths of secrets
- First 4-20 characters of API keys
- KV credentials preview
- Admin code preview

**Example Response:**
```json
{
  "ADMIN_ACCESS_CODE": {
    "set": true,
    "length": 4,
    "preview": "6969..."
  },
  "KV_REST_API_TOKEN": {
    "set": true,
    "length": 64,
    "preview": "AYNxASQgM..."
  }
}
```

**Recommendation:** 🔴 **DELETE THIS ENDPOINT** before production deployment.

---

## 0.2 PAYMENT READINESS

### Current Access Token System

**Storage:** Upstash KV (Redis)

**Data Model:**
```typescript
// Key: token:{accessCode}
// Structure: Redis Hash (HSET)
{
  queries_allowed: string,      // e.g., "30"
  queries_remaining: string,    // e.g., "25"
  isActive: string,             // "true" | "false"
  created_at: string            // ISO timestamp
}
```

**Token Format:** `test-{base64url(6 random bytes)}`  
**Example:** `test-AbCdEf123456`

**Creation Flow:**
1. Admin calls `/api/admin/generate-codes` with admin code
2. POST body: `{ adminCode, count: 5, queries: 30 }`
3. System generates tokens using `crypto.randomBytes(6)`
4. Tokens stored in KV with HSET command
5. Returns array of generated tokens

**Verification Flow:**
1. User enters code in `AccessCodeModal`
2. POST to `/api/auth/login` with code
3. System checks:
   - Is it admin code? → Set `access_mode=admin` cookie
   - Is it in KV? → Verify `isActive=true` and `queries_remaining > 0`
4. Sets cookies: `access_mode=token`, `access_token={code}`
5. Returns `{ mode: 'token', remaining, allowed }`

**Decrement Flow:**
1. Every API call checks cookies
2. If `access_mode=token`:
   - Fetch token data from KV: `HGETALL token:{code}`
   - Check `queries_remaining > 0`
   - Decrement: `HINCRBY token:{code} queries_remaining -1`
   - Return updated remaining count
3. If `access_mode=admin`:
   - Skip quota check entirely

**Files Implementing Decrement:**
- `src/app/api/debate/step/route.ts` (debate turns)
- `src/app/api/debate/oracle/route.ts` (Oracle analysis)
- `src/app/api/chat/message/route.ts` (chat messages)

### Existing Stripe Code

**Finding:** ❌ **NO STRIPE CODE EXISTS**

**Search Results:**
```bash
grep -ri "stripe" src/
# No matches found
```

**Assessment:** ✅ **CLEAN SLATE** - No legacy code to refactor

### Integration Points for Stripe

**Proposed Checkout Trigger Locations:**

1. **Header Display** (when queries low)
   - `src/app/page.tsx` (line 359-360) - Shows queries remaining
   - Could add "Buy More" button when `remaining < 5`

2. **AccessCodeModal Enhancement**
   - `src/components/AccessCodeModal.tsx`
   - Add "Don't have a code? Purchase access" link

3. **Dedicated Purchase Page**
   - New route: `src/app/purchase/page.tsx`
   - Stripe Checkout integration

**Token Replenishment Logic:**

Current token structure supports adding queries:
```typescript
// After successful payment, update existing token:
await kv(['HINCRBY', `token:{code}`, 'queries_remaining', String(purchasedAmount)]);
await kv(['HINCRBY', `token:{code}`, 'queries_allowed', String(purchasedAmount)]);
```

**Webhook Handler Location:**
- New file: `src/app/api/stripe/webhook/route.ts`
- Vercel deployment: Configure webhook URL in Stripe dashboard

### Questions for Saya

1. **Pricing Model:**
   - Free tier? If yes, how many queries?
   - Paid tiers: One-time purchase or subscription?
   - Price per query tier? (e.g., $5 for 50 queries, $10 for 120 queries)

2. **User Experience:**
   - Can users top-up existing tokens or must buy new ones?
   - Should we link Stripe customer ID to access tokens?
   - Email receipts? (requires collecting email)

3. **Token Management:**
   - Should purchased tokens expire?
   - Different query limits for different models? (GPT-5 costs more)
   - Refund policy?

---

## 0.3 ONBOARDING GAPS

### Current New User Flow

**Step-by-Step Experience:**

1. **Landing:** User visits `/` (debate page)
2. **Immediate Block:** `AccessCodeModal` appears (full-screen overlay)
3. **No Context:** Modal shows:
   - "ACCESS REQUIRED"
   - "Enter your assigned access code to proceed."
   - Input field with placeholder `test-xxxxxxxx`
   - "UNLOCK" button
4. **No Explanation:** User has no idea:
   - What this platform does
   - Why they need a code
   - How to get a code
   - What happens after entering code
5. **Post-Auth:** Modal disappears, user sees complex debate interface with:
   - Model selectors (16 models, unfamiliar names)
   - Persona selectors (42 personas)
   - Sliders (agreeability, extensiveness)
   - No tooltips or guidance

**Pain Points Identified:**

❌ **No Pre-Auth Information**
- User can't see what the platform offers before entering code
- No landing page explaining features
- No demo or preview

❌ **No Onboarding Tutorial**
- First-time users dropped into complex UI
- No explanation of personas, models, or debate mechanics
- No guided first debate

❌ **No Help System**
- Zero tooltips
- No "?" icons for explanations
- No documentation link
- No FAQ

❌ **Confusing Terminology**
- "Agreeability" - what does this mean?
- "Extensiveness" - response length?
- "Oracle" - what's this?
- Model names like "moonshot-v1-128k" - cryptic

### Existing Tutorial/Guide Content

**Finding:** ❌ **NO TUTORIAL CONTENT EXISTS**

**Checked:**
- No `tutorial/` or `guide/` routes
- No `HelpModal` or `TutorialModal` components
- No `onboarding/` directory
- No tooltips in any component

**Documentation Files:**
- `README.md` exists but is developer-focused
- No user-facing documentation

### AccessCodeModal Flow

**File:** `src/components/AccessCodeModal.tsx`

**Current Implementation:**
- Blocks entire app until code entered
- No escape route (no "Learn More" or "Demo" option)
- Error messages are generic ("Invalid access code")
- No link to purchase/request access

**Improvement Opportunities:**
1. Add "What is Matrix Arena?" link
2. Add "Request Access" or "Purchase Access" button
3. Show sample debate screenshot/video
4. Explain what happens after entering code

### Tooltips and Help Text

**Finding:** ❌ **NO TOOLTIPS ANYWHERE**

**Searched for:**
- `title=` attributes: Found only in basic HTML elements
- `Tooltip` components: None exist
- `?` icons: None found
- `aria-label` for accessibility: Minimal usage

**Components That Need Tooltips:**
1. **Model Selector** - Explain model differences
2. **Persona Selector** - Show persona background
3. **Agreeability Slider** - Explain stubbornness vs cooperation
4. **Extensiveness Slider** - Explain response length
5. **Oracle Button** - Explain what Oracle analysis does
6. **TTS Buttons** - Explain text-to-speech feature

---

## 0.4 MISSING PIECES AUDIT

### .env.local.example Status

**Finding:** ❌ **DOES NOT EXIST**

**Checked:**
```bash
ls -la .env*
# Results:
# .env.local (exists, gitignored)
# .env.local.example (NOT FOUND)
# .env.example (NOT FOUND)
```

**Impact:** 🔴 **CRITICAL**
- New developers/deployers won't know which env vars are required
- Vercel deployment will fail without proper configuration
- No documentation of optional vs required variables

**Recommendation:** Create `.env.local.example` in Phase 1

### Placeholder ElevenLabs Voice IDs

**Finding:** ✅ **CONFIRMED - 22 PLACEHOLDERS**

**File:** `src/lib/personas.ts`

**Placeholder ID:** `S9WrLrqYPJzmQyWPWbZ5`

**Personas Using Placeholder (22 total):**

1. Diogenes (A5)
2. Confucius (A6)
3. Buddha (A7)
4. Kierkegaard (A8)
5. Schopenhauer (A9)
6. Aristotle (A35)
7. **Zeus (A36)** - Deity
8. **Quetzalcoatl (A37)** - Deity
9. **Aphrodite (A38)** - Deity
10. **Shiva (A39)** - Deity
11. **Anubis (A40)** - Deity
12. **Prometheus (A41)** - Deity
13. **Loki (A42)** - Deity
14. Cleopatra VII (A13)
15. Orwell (A18)
16. Kafka (A19)
17. Oscar Wilde (A20)
18. Darwin (A21)
19. Tesla (A23)
20. Leonardo da Vinci (A24)
21. Ayn Rand (A32)
22. Carl Sagan (A34)

**Note:** All 7 deity personas use placeholder voices

**TODO Comments:** 15 instances of `// TODO: Replace with custom ElevenLabs voice ID when available`

### Console.log Statements

**Finding:** ⚠️ **274 CONSOLE.LOG STATEMENTS ACROSS 28 FILES**

**Top Offenders:**
1. `src/lib/orchestrator.ts` - 60 statements
2. `src/hooks/useDebate.ts` - 67 statements
3. `src/components/AudioPlayer.tsx` - 26 statements
4. `src/components/PlayAllButton.tsx` - 21 statements

**Sensitive Data Logged:**
- `src/app/api/auth/login/route.ts` (line 56): Logs actual access codes
- `src/app/api/admin/generate-codes/route.ts`: Logs admin codes
- Multiple files log API key prefixes

**Recommendation:**
- 🟢 **KEEP:** Error logging, important state changes
- 🔴 **REMOVE:** Debug logs with sensitive data
- 🟡 **GUARD:** Wrap non-critical logs in `if (process.env.NODE_ENV === 'development')`

### TypeScript Errors

**Finding:** ✅ **NO TYPESCRIPT ERRORS**

**Command Run:**
```bash
npx tsc --noEmit
```

**Result:** Clean compilation, no errors

**Assessment:** ✅ **EXCELLENT** - Type safety maintained

### TODO/FIXME Comments

**Finding:** ✅ **ONLY 15 TODO COMMENTS (ALL FOR VOICE IDS)**

**All TODOs:**
```
src/lib/personas.ts (15 instances):
// TODO: Replace with custom ElevenLabs voice ID when available
```

**Assessment:** ✅ **CLEAN** - No forgotten features or bugs marked with TODO

---

## 📊 RISK ASSESSMENT MATRIX

| Issue | Severity | Impact | Effort to Fix | Priority |
|-------|----------|--------|---------------|----------|
| Default admin code "6969" | 🔴 CRITICAL | Complete system compromise | 🟢 LOW (1 hour) | **P0** |
| Unprotected `/api/debug-env` | 🔴 CRITICAL | Exposes all env vars | 🟢 LOW (15 min) | **P0** |
| No `.env.local.example` | 🔴 CRITICAL | Deployment failure | 🟢 LOW (30 min) | **P0** |
| Access codes logged | 🟡 HIGH | Code theft from logs | 🟢 LOW (15 min) | **P1** |
| 274 console.log statements | 🟡 HIGH | Performance + security | 🟡 MEDIUM (2-3 hours) | **P1** |
| No onboarding | 🟡 HIGH | Poor UX, user confusion | 🔴 HIGH (4-6 hours) | **P2** |
| 22 placeholder voice IDs | 🟢 MEDIUM | Robotic duplicate voices | 🔴 HIGH (voice selection) | **P3** |
| Unprotected debug endpoints | 🟢 LOW | Minor info disclosure | 🟢 LOW (30 min) | **P1** |

---

## 🎯 RECOMMENDED ACTION PLAN

### Immediate (Phase 1 - Security Hardening)

**Must Complete Before ANY Beta Testing:**

1. ✅ **Create `.env.local.example`** (30 min)
   - Document all required variables
   - Add comments explaining each
   - Include in git repo

2. ✅ **Remove Default Admin Code** (1 hour)
   - Make `ADMIN_ACCESS_CODE` required
   - Add startup validation
   - Throw error if not set in production

3. ✅ **Delete `/api/debug-env`** (15 min)
   - Remove file entirely
   - Or protect with admin-only middleware

4. ✅ **Remove Sensitive Logging** (1 hour)
   - Remove access code logging
   - Remove API key logging
   - Guard debug logs with NODE_ENV check

5. ✅ **Protect Debug Endpoints** (30 min)
   - Add admin check to `/api/debug/personality`
   - Add admin check to `/api/admin/tts-status`
   - Or disable via environment flag

**Total Time:** ~3-4 hours  
**Autonomy:** 🟢 FULL (except endpoint protection strategy - propose first)

### Short-Term (Phase 2 - Payment)

**Required for Monetization:**

1. 🟡 **Payment Investigation** (2 hours)
   - Document current token system
   - Design Stripe integration architecture
   - **STOP** and await Saya approval

2. 🟡 **Stripe Implementation** (4-6 hours, after approval)
   - Install Stripe SDK
   - Create checkout route
   - Create webhook handler
   - Test in Stripe test mode

**Total Time:** 6-8 hours  
**Autonomy:** 🟡 CHECK (investigation first, then await approval)

### Medium-Term (Phase 3 - Onboarding)

**Required for Good UX:**

1. 🔴 **Onboarding Design** (await Saya)
   - Decide on tutorial approach
   - Define what to explain
   - Design user flow

2. 🔴 **Implementation** (4-6 hours, after design)
   - Build chosen onboarding system
   - Add tooltips
   - Create help content

**Total Time:** 4-6 hours (after design decisions)  
**Autonomy:** 🔴 AWAIT (UX/design territory)

### Long-Term (Phase 4 - Polish)

**Nice to Have:**

1. 🟡 **Voice ID Assignment** (2-3 hours + voice selection time)
   - Saya selects 22 voices from ElevenLabs
   - Update personas.ts
   - Test each voice

2. 🟢 **Console Log Cleanup** (2-3 hours)
   - Review all 274 statements
   - Remove unnecessary logs
   - Guard development-only logs

**Total Time:** 4-6 hours  
**Autonomy:** Mixed (voice selection needs Saya, cleanup is autonomous)

---

## 🚦 PHASE 1 READINESS

### Can We Proceed to Phase 1?

**Answer:** ✅ **YES - WITH CLARIFICATION NEEDED**

**Autonomous Tasks (Can Start Immediately):**
- ✅ Create `.env.local.example`
- ✅ Remove default admin code fallback
- ✅ Remove sensitive logging

**Need Saya/Claude Decision:**
- 🟡 Debug endpoint strategy:
  - **Option A:** Delete `/api/debug-env` entirely (RECOMMENDED)
  - **Option B:** Protect with admin-only middleware
  - **Option C:** Disable via `ENABLE_DEBUG_ENDPOINTS` env flag

- 🟡 `/api/debug/personality` endpoint:
  - **Option A:** Protect with admin check (useful for testing)
  - **Option B:** Delete entirely
  - **Option C:** Disable via env flag

### Files Ready for Phase 1 Modification

**Will Modify:**
1. `src/app/api/auth/login/route.ts` - Remove default, remove logging
2. `src/app/api/verify-code/route.ts` - Remove default
3. `src/app/api/admin/generate-codes/route.ts` - Remove default, remove logging
4. `src/app/api/admin/toggle-tts/route.ts` - Remove default
5. `src/app/api/debug-env/route.ts` - Delete or protect
6. `src/app/api/debug/personality/route.ts` - Protect or delete

**Will Create:**
1. `.env.local.example` - New file with all env vars documented

---

## 📞 NEXT STEPS

### For Greeny (Me):

**Awaiting Decision On:**
1. Debug endpoint strategy (Option A, B, or C above)
2. Approval to proceed with Phase 1 implementation

**Ready to Execute:**
- Once strategy approved, can complete Phase 1 in ~3-4 hours
- Will create `GREENY_PHASE1_IMPLEMENTATION_REPORT.md` upon completion

### For Claude:

**Please Review:**
1. Risk assessment accuracy
2. Priority rankings
3. Recommended action plan

**Please Discuss with Saya:**
1. Debug endpoint strategy preference
2. Payment tier structure (for Phase 2 planning)
3. Onboarding approach preference (for Phase 3 planning)

### For Saya:

**Immediate Decisions Needed:**
1. Approve Phase 1 security hardening approach
2. Choose debug endpoint strategy

**Future Decisions (Not Urgent):**
1. Payment pricing model
2. Onboarding tutorial style
3. Voice ID selections for 22 personas

---

**Report Status:** ✅ COMPLETE  
**Next Action:** Await Claude/Saya review and approval to proceed to Phase 1  
**Estimated Phase 1 Duration:** 3-4 hours after approval

