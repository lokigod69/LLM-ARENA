# 🟢 GREENY: PHASE 1 IMPLEMENTATION INSTRUCTIONS

**From:** Claude (Strategic Partner)  
**To:** Greeny (Cursor Coding Agent)  
**Date:** November 22, 2025  
**Status:** ✅ APPROVED — PROCEED WITH IMPLEMENTATION

---

## 📊 REPORT REVIEW

**Verdict:** Excellent investigation, Greeny. Your findings are accurate and well-documented. Saya and I have reviewed everything.

### Key Confirmations
- ✅ Codex was correct about the "6969" issue — it exists in code even though Saya has it set in their `.env.local`
- ✅ The vulnerability is in the CODE ITSELF (fallback pattern), not the deployment
- ✅ `/api/debug-env` must go — no discussion needed
- ✅ Cookie security is solid — no changes needed
- ✅ Clean TypeScript compilation — great

---

## 🎯 DECISIONS MADE

### Debug Endpoint Strategy

| Endpoint | Decision | Reason |
|----------|----------|--------|
| `/api/debug-env` | 🔴 **DELETE ENTIRELY** | Exposes secrets, no legitimate use case |
| `/api/debug/personality` | 🟡 **PROTECT with admin check** | Useful for testing persona prompts |
| `/api/admin/tts-status` | 🟡 **PROTECT with admin check** | Minor info but should be protected |

### Admin Code Strategy

**Decision:** Make `ADMIN_ACCESS_CODE` REQUIRED in production

- If `NODE_ENV === 'production'` and no `ADMIN_ACCESS_CODE` → throw error, refuse to start
- In development, can use fallback (for local testing convenience)
- Log a WARNING in development if using fallback

### Console Log Strategy

**Decision:** Two-pass approach
1. **IMMEDIATE (P0):** Remove sensitive data logging (access codes, API key prefixes)
2. **LATER:** General cleanup of debug logs (can be Phase 5 or post-beta)

---

## 📋 PHASE 1 TASK LIST

### Task 1.1: Create `.env.local.example`
**Autonomy:** 🟢 FULL  
**Time:** 30 minutes  
**Priority:** P0

**Create file:** `.env.local.example` in project root

**Contents:**
```bash
# ============================================
# MATRIX ARENA - Environment Variables
# ============================================
# Copy this file to .env.local and fill in your values
# DO NOT commit .env.local to version control
# ============================================

# === REQUIRED: Authentication ===
# Admin access code - CHANGE THIS IN PRODUCTION
# Used for admin operations (generating tokens, toggling TTS, etc.)
ADMIN_ACCESS_CODE=your_secure_admin_code_here

# === REQUIRED: Upstash KV (Redis) ===
# Get these from: https://console.upstash.com/
# Used for access token storage and rate limiting
KV_REST_API_URL=https://your-region.upstash.io
KV_REST_API_TOKEN=your_kv_token_here

# Alternative variable names (some Vercel integrations use these)
# KV_URL=https://your-region.upstash.io
# KV_TOKEN=your_kv_token_here

# === REQUIRED: AI Providers ===
# At minimum, you need ONE provider configured
# Get keys from respective provider dashboards

# OpenAI - https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# Anthropic - https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-...

# Google Gemini - https://aistudio.google.com/apikey
GOOGLE_GENERATIVE_AI_API_KEY=AIza...

# xAI (Grok) - https://console.x.ai/
GROK_API_KEY=xai-...

# DeepSeek - https://platform.deepseek.com/
DEEPSEEK_API_KEY=sk-...

# Moonshot (Kimi) - https://platform.moonshot.cn/
MOONSHOT_API_KEY=sk-...

# OpenRouter (for Qwen) - https://openrouter.ai/
OPENROUTER_API_KEY=sk-or-...

# === OPTIONAL: Supabase ===
# Database for saving debates and chat sessions
# App works without these (graceful degradation to localStorage only)
# Get from: https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# === OPTIONAL: ElevenLabs TTS ===
# Text-to-speech for persona voices
# Get from: https://elevenlabs.io/
ELEVENLABS_API_KEY=your_elevenlabs_key

# === DEVELOPMENT ONLY ===
# Set to 'true' to use mock responses instead of real API calls
# MOCK_MODE=false

# Automatically set by Next.js
# NODE_ENV=development
```

**Checklist:**
- [ ] Create file in project root
- [ ] Include ALL variables from Greeny's investigation
- [ ] Add helpful comments with provider URLs
- [ ] Indicate which are REQUIRED vs OPTIONAL
- [ ] Add to `.gitignore` check (should already be there, but verify `.env*.local` is ignored)

---

### Task 1.2: Remove Admin Code Fallback
**Autonomy:** 🟢 FULL  
**Time:** 1 hour  
**Priority:** P0

**Files to modify:**
1. `src/app/api/auth/login/route.ts` (line 65)
2. `src/app/api/verify-code/route.ts` (line 45)
3. `src/app/api/admin/generate-codes/route.ts` (line 39)
4. `src/app/api/admin/toggle-tts/route.ts` (line 35)
5. `src/app/api/debug-env/route.ts` (line 42) — Will be deleted anyway

**Pattern to find:**
```typescript
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || "6969";
```

**Replace with:**
```typescript
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE;

// Validate in production
if (process.env.NODE_ENV === 'production' && !ADMIN_ACCESS_CODE) {
  console.error('🔴 CRITICAL: ADMIN_ACCESS_CODE not set in production!');
  return NextResponse.json(
    { error: 'Server configuration error' },
    { status: 500 }
  );
}

// Development fallback with warning
if (!ADMIN_ACCESS_CODE) {
  console.warn('⚠️ WARNING: Using default admin code in development. Set ADMIN_ACCESS_CODE in .env.local');
}

const effectiveAdminCode = ADMIN_ACCESS_CODE || '6969'; // Only used in dev
```

**Alternative (cleaner):** Create a shared utility

**Create file:** `src/lib/auth-config.ts`
```typescript
/**
 * Get admin access code with production safety check
 */
export function getAdminAccessCode(): string {
  const adminCode = process.env.ADMIN_ACCESS_CODE;
  
  if (process.env.NODE_ENV === 'production') {
    if (!adminCode) {
      throw new Error('ADMIN_ACCESS_CODE must be set in production');
    }
    return adminCode;
  }
  
  // Development mode
  if (!adminCode) {
    console.warn('⚠️ Using default admin code "6969" in development');
    return '6969';
  }
  
  return adminCode;
}

/**
 * Validate request has admin access
 */
export function isAdminRequest(providedCode: string | undefined): boolean {
  if (!providedCode) return false;
  try {
    return providedCode === getAdminAccessCode();
  } catch {
    return false;
  }
}
```

Then update all 5 files to use:
```typescript
import { getAdminAccessCode, isAdminRequest } from '@/lib/auth-config';

// In route handler:
const { adminCode } = await request.json();
if (!isAdminRequest(adminCode)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Recommendation:** Use the shared utility approach — cleaner, DRY, easier to maintain.

**Checklist:**
- [ ] Create `src/lib/auth-config.ts`
- [ ] Update `src/app/api/auth/login/route.ts`
- [ ] Update `src/app/api/verify-code/route.ts`
- [ ] Update `src/app/api/admin/generate-codes/route.ts`
- [ ] Update `src/app/api/admin/toggle-tts/route.ts`
- [ ] (Skip debug-env — will be deleted)
- [ ] Test in development (should work with warning)
- [ ] Verify TypeScript compiles

---

### Task 1.3: Delete `/api/debug-env`
**Autonomy:** 🟢 FULL  
**Time:** 15 minutes  
**Priority:** P0

**Action:** DELETE the entire file

**File to delete:** `src/app/api/debug-env/route.ts`

**Verification:**
- [ ] Delete file
- [ ] Check no other files import from it
- [ ] Verify app still compiles
- [ ] Verify app still runs

---

### Task 1.4: Protect Debug Endpoints
**Autonomy:** 🟢 FULL  
**Time:** 30 minutes  
**Priority:** P1

**Files to modify:**
1. `src/app/api/debug/personality/route.ts`
2. `src/app/api/admin/tts-status/route.ts`

**Add admin check to each:**

```typescript
import { cookies } from 'next/headers';
import { isAdminRequest } from '@/lib/auth-config';

export async function GET(request: Request) {
  // Admin check
  const cookieStore = cookies();
  const accessMode = cookieStore.get('access_mode')?.value;
  
  if (accessMode !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }
  
  // ... rest of existing code
}
```

**Alternative (if endpoint accepts POST with adminCode):**
```typescript
export async function POST(request: Request) {
  const { adminCode } = await request.json();
  
  if (!isAdminRequest(adminCode)) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }
  
  // ... rest of existing code
}
```

**Checklist:**
- [ ] Add admin check to `/api/debug/personality`
- [ ] Add admin check to `/api/admin/tts-status`
- [ ] Test endpoints return 403 without admin cookie
- [ ] Test endpoints work WITH admin cookie

---

### Task 1.5: Remove Sensitive Logging
**Autonomy:** 🟢 FULL  
**Time:** 1 hour  
**Priority:** P1

**Critical logs to REMOVE:**

1. **`src/app/api/auth/login/route.ts` (line 56)**
   - Find: Any log that includes actual access codes
   - Action: Remove entirely or redact to `code: [REDACTED]`

2. **`src/app/api/admin/generate-codes/route.ts`**
   - Find: Logs that show generated tokens
   - Action: Remove or redact

3. **Any file logging API key prefixes**
   - Find: Logs showing `sk-...` or similar
   - Action: Remove

**Pattern to find sensitive logs:**
```bash
# Search for potential sensitive logging
grep -rn "console.log.*code" src/
grep -rn "console.log.*token" src/
grep -rn "console.log.*key" src/
grep -rn "console.log.*password" src/
grep -rn "console.log.*secret" src/
```

**What to KEEP:**
- Error logs (useful for debugging)
- State change logs (e.g., "Debate started", "Message sent")
- Performance logs (if any)

**What to REMOVE:**
- Any log containing access codes, tokens, or secrets
- Any log containing API keys (even prefixes)
- Verbose debug logs that expose internal state

**Checklist:**
- [ ] Remove access code logging from login route
- [ ] Remove token logging from generate-codes route
- [ ] Search for and remove any API key logging
- [ ] Verify no sensitive data in remaining logs

---

### Task 1.6: General Console Log Audit (OPTIONAL FOR NOW)
**Autonomy:** 🟢 FULL (but can defer to Phase 5)  
**Time:** 2-3 hours  
**Priority:** P2 (not blocking beta)

**If you have time:** Review the 274 console.log statements

**Quick wins:**
- Wrap verbose debug logs in: `if (process.env.NODE_ENV === 'development') { ... }`
- Remove obviously unnecessary logs
- Keep error logs

**Files with most logs (tackle first if doing this):**
1. `src/hooks/useDebate.ts` (67 statements)
2. `src/lib/orchestrator.ts` (60 statements)
3. `src/components/AudioPlayer.tsx` (26 statements)

**This can wait** — Friends/family beta testers won't be checking console.

---

## 📝 DELIVERABLE

When complete, create: `GREENY_PHASE1_IMPLEMENTATION_REPORT.md`

**Template:**
```markdown
# 🟢 GREENY PHASE 1 IMPLEMENTATION REPORT

**Date:** [Date]
**Status:** ✅ COMPLETE

## Changes Made

### 1.1 Created `.env.local.example`
- ✅ Created file with [X] variables documented
- ✅ Verified .gitignore excludes .env*.local

### 1.2 Admin Code Security
- ✅ Created `src/lib/auth-config.ts`
- ✅ Updated 4 files to use shared utility
- ✅ Production throws error if ADMIN_ACCESS_CODE not set
- ✅ Development shows warning and uses fallback

### 1.3 Deleted `/api/debug-env`
- ✅ File deleted
- ✅ No broken imports

### 1.4 Protected Debug Endpoints
- ✅ `/api/debug/personality` now requires admin cookie
- ✅ `/api/admin/tts-status` now requires admin cookie

### 1.5 Removed Sensitive Logging
- ✅ Removed [X] sensitive log statements
- ✅ No access codes logged
- ✅ No API keys logged

### 1.6 Console Log Cleanup (if completed)
- [Status]

## Files Modified
- [List all files with brief description of changes]

## Files Created
- `.env.local.example`
- `src/lib/auth-config.ts`

## Files Deleted
- `src/app/api/debug-env/route.ts`

## Testing
- [ ] App compiles without errors
- [ ] App runs in development
- [ ] Admin login still works
- [ ] Token login still works
- [ ] Debug endpoints return 403 without admin

## Next Steps
- Ready for Phase 2 (Payment Investigation)
```

---

## ⏱️ TIME ESTIMATE

| Task | Time |
|------|------|
| 1.1 Create .env.local.example | 30 min |
| 1.2 Admin code security | 1 hour |
| 1.3 Delete debug-env | 15 min |
| 1.4 Protect debug endpoints | 30 min |
| 1.5 Remove sensitive logging | 1 hour |
| **Total** | **~3.5 hours** |

---

## 🚦 GO SIGNAL

**Status:** ✅ **APPROVED TO PROCEED**

You have full autonomy on all Phase 1 tasks. No need to check back until complete.

When done:
1. Create the implementation report
2. Share with Saya
3. Saya will loop me in for Phase 2 planning

**Questions?** If you hit any blockers or ambiguities, document them in the report and make your best judgment call. We trust your decisions on implementation details.

---

**Good luck, Greeny! 🚀**
