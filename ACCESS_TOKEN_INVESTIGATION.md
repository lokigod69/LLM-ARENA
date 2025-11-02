# Access Token System - Comprehensive Investigation

**Date:** Investigation Report  
**Scope:** Complete architecture analysis of access token system, query limits, and user flow

---

## Executive Summary

The access token system has three main components:
1. **Master Admin Token** (`6969`) - Hardcoded, unlimited access
2. **Generated Access Tokens** - Created locally via admin API, stored in Upstash KV (Redis)
3. **Query Limiting System** - Tracks remaining queries per token

**Key Findings:**
- ✅ Token generation and storage working correctly
- ✅ Query decrementing implemented in both `/api/debate/step` and `/api/debate/oracle`
- ⚠️ **CRITICAL GAP:** No periodic query verification on frontend when user is logged in
- ⚠️ **UX GAP:** No UI feedback when queries run out (inputs remain enabled)
- ⚠️ **SECURITY RISK:** Hardcoded master token in multiple files
- ⚠️ **DATA CONSISTENCY:** No periodic sync of queries remaining from backend

---

## 1. Master Token (`6969`)

### Location & Implementation

**Found in 3 files:**
1. `src/app/api/auth/login/route.ts` (line 30)
2. `src/app/api/verify-code/route.ts` (line 31)
3. `src/app/api/admin/generate-codes/route.ts` (line 34)

### Behavior
- **Hardcoded value:** `"6969"`
- **Access level:** Unlimited queries (bypasses all quota checks)
- **Cookie set:** `access_mode = 'admin'` (no `access_token` cookie)
- **Verification:** Simple string comparison

### Security Concerns
- ❌ **CRITICAL:** Hardcoded in source code (visible in repository)
- ❌ Should be moved to environment variable
- ❌ No rotation mechanism

---

## 2. Generated Access Tokens

### Token Generation
**Endpoint:** `/api/admin/generate-codes`  
**Location:** `src/app/api/admin/generate-codes/route.ts`

**Process:**
1. Requires admin code (`6969`) for authorization
2. Generates tokens with format: `test-{base64url(6 random bytes)}`
3. Stores in Upstash KV as Redis hash:
   ```
   token:{token-id}
     - queries_allowed: {number}
     - queries_remaining: {number}
     - isActive: 'true'
     - created_at: {ISO timestamp}
   ```
4. Default queries: `3` (configurable via request body)

**Storage Backend:**
- **Service:** Upstash KV (Redis-compatible)
- **URL:** `https://touching-stallion-7895.upstash.io`
- **Auth:** Bearer token in Authorization header
- **Operations:** Uses direct REST API calls to KV service

### Token Structure
```typescript
{
  queries_allowed: string,      // Original quota
  queries_remaining: string,    // Current remaining (decremented)
  isActive: string,             // 'true' or 'false'
  created_at: string            // ISO timestamp
}
```

### Token Usage Flow
1. User enters token in `AccessCodeModal`
2. POST to `/api/auth/login` with token
3. Backend validates:
   - Token exists in KV
   - `isActive === 'true'`
   - `queries_remaining > 0`
4. Sets cookies:
   - `access_mode = 'token'`
   - `access_token = {token-id}` (HttpOnly, secure in production)

---

## 3. Query Limiting System

### Backend Implementation

#### A. Debate Step Endpoint (`/api/debate/step`)
**Location:** `src/app/api/debate/step/route.ts` (lines 74-105)

**Process:**
1. Check cookies: `access_mode` and `access_token`
2. If `access_mode === 'token'`:
   - Fetch token data from KV
   - Validate `isActive === 'true'`
   - Validate `queries_remaining > 0`
   - **Pre-decrement:** `queries_remaining - 1`
   - **Update KV immediately** (atomic operation)
   - Continue with debate logic
3. Returns `remaining` in response body

**Important:** Quota is **pre-decremented** before API call. If API call fails, quota is still consumed (intentional to prevent abuse).

#### B. Oracle Analysis Endpoint (`/api/debate/oracle`)
**Location:** `src/app/api/debate/oracle/route.ts` (lines 302-333)

**Process:**
- **Same logic as debate step**
- Oracle analysis also consumes 1 query
- ✅ **FIXED:** Previously bypassed quota (now decrements)

### Frontend Implementation

#### Query Remaining State
**Location:** `src/app/page.tsx` (line 37)

```typescript
const [queriesRemaining, setQueriesRemaining] = useState<number | string>('...');
```

**Initial Values:**
- Admin mode: `'Unlimited'`
- Token mode: Number from login response

**Updates:**
- On login: Set from login response
- After each API call: Updated from response `remaining` field
- **NO periodic verification** ⚠️

#### Display
**Location:** `src/app/page.tsx` (lines 232-234)

```tsx
<div>
  <p className="text-xs text-matrix-green-dim">QUERIES REMAINING</p>
  <p className="text-sm text-matrix-text font-matrix">{queriesRemaining}</p>
</div>
```

**Issues:**
- ⚠️ Displays stale value if queries consumed elsewhere
- ⚠️ No visual indication when queries reach 0
- ⚠️ No periodic refresh from backend

---

## 4. Authentication Flow

### Login Flow
```
User enters token
    ↓
POST /api/auth/login { code: token }
    ↓
Backend checks:
  - Is it "6969"? → admin mode
  - Else → lookup in KV
    ↓
If valid token:
  - Validate isActive
  - Validate queries_remaining > 0
  - Set cookies (HttpOnly)
  - Return { mode, remaining, allowed }
    ↓
Frontend sets state:
  - isUnlocked = true
  - queriesRemaining = remaining
```

### Verification Endpoint
**Location:** `src/app/api/auth/verify/route.ts`

**Purpose:** Check current auth state (not used in current frontend)

**Returns:**
```typescript
{
  mode: 'admin' | 'token' | 'none',
  token?: string,
  remaining?: number,
  allowed?: number,
  error?: string
}
```

**Note:** Currently **NOT called** by frontend after initial login.

### Logout Endpoint
**Location:** `src/app/api/auth/logout/route.ts`

**Process:**
- Clears `access_mode` and `access_token` cookies
- Returns `{ ok: true }`

---

## 5. What Happens When Queries Run Out?

### Backend Behavior

**When `queries_remaining <= 0`:**

1. **Login attempt:**
   - `src/app/api/auth/login/route.ts` (line 63-64)
   - Returns: `{ error: 'No queries remaining' }` (403)

2. **Debate step attempt:**
   - `src/app/api/debate/step/route.ts` (line 94-95)
   - Returns: `{ error: 'No queries remaining' }` (403)

3. **Oracle analysis attempt:**
   - `src/app/api/debate/oracle/route.ts` (line 322-323)
   - Returns: `{ success: false, error: 'No queries remaining' }` (403)

### Frontend Behavior

**Current State:**
- ❌ **Input field remains enabled** (`PromptInput.tsx` doesn't check queries)
- ❌ **No UI feedback** when queries = 0
- ❌ **No message displayed** about exhausted quota
- ⚠️ Error only appears when user tries to start debate

**Expected vs Actual:**
- **Expected:** Disable inputs, show message, prevent new debates
- **Actual:** UI remains functional, error only on API call

---

## 6. Current Issues & Gaps

### Critical Issues

#### 1. No Periodic Query Verification
**Problem:** Frontend never refreshes `queriesRemaining` from backend after login.

**Impact:**
- If queries consumed in another session/tab, frontend shows stale count
- User may think they have queries when they don't
- No way to sync state without page refresh

**Solution Needed:**
- Periodic polling of `/api/auth/verify` every 30-60 seconds
- Or: Check queries before each debate start

#### 2. No UI Feedback When Queries Exhausted
**Problem:** Inputs remain enabled, no indication that queries are 0.

**Impact:**
- Poor UX - user tries to start debate, gets error
- Should disable inputs proactively

**Solution Needed:**
- Check `queriesRemaining` in `PromptInput` component
- Disable input when `queriesRemaining === 0` (and not admin)
- Show message: "No queries remaining"

#### 3. Hardcoded Master Token
**Problem:** Master token `6969` hardcoded in 3 files.

**Impact:**
- Security risk if code is public
- Cannot rotate without code changes

**Solution Needed:**
- Move to environment variable `ADMIN_ACCESS_CODE`
- Update all 3 files to use `process.env.ADMIN_ACCESS_CODE`

### Medium Priority Issues

#### 4. Stale Query Count Display
**Problem:** Header shows `queriesRemaining` but it's not synced after each action.

**Impact:**
- May show incorrect count if state update fails

**Solution Needed:**
- Verify state updates after each API call
- Add error handling if update fails

#### 5. No Query Count Check Before Starting Debate
**Problem:** `handleStartDebate` doesn't check queries before calling `startDebate`.

**Impact:**
- Wasteful API call when queries = 0
- Error only returned from backend

**Solution Needed:**
- Pre-check: `if (queriesRemaining === 0 && !isAdmin) return;`

---

## 7. Security Analysis

### Current Security Measures ✅
- HttpOnly cookies (prevents XSS access to tokens)
- Secure flag in production
- SameSite: 'lax' (CSRF protection)
- Token validation on every API call
- Pre-decrement prevents race conditions (somewhat)

### Security Vulnerabilities ❌

#### 1. Hardcoded Admin Token
- **Risk:** High
- **Mitigation:** Move to environment variable

#### 2. No Token Expiration
- **Risk:** Medium
- **Impact:** Tokens never expire
- **Mitigation:** Add `expires_at` field, validate on use

#### 3. KV Token Exposed
- **Risk:** Low-Medium
- **Impact:** KV token in source code (visible)
- **Mitigation:** Move to environment variable

#### 4. No Rate Limiting
- **Risk:** Medium
- **Impact:** Can spam verification/login endpoints
- **Mitigation:** Add rate limiting (e.g., 5 attempts/minute)

#### 5. Atomic Operations
- **Risk:** Low
- **Current:** Pre-decrement then update (could fail between)
- **Better:** Use Redis `DECR` for atomic decrement

---

## 8. Data Flow Diagrams

### Login Flow
```
┌─────────┐         ┌──────────────┐         ┌──────────┐
│  User   │────────▶│ /api/auth/   │────────▶│ Upstash │
│  Input  │  token  │ login        │  query  │   KV    │
└─────────┘         └──────────────┘         └──────────┘
                           │
                           │ { mode, remaining }
                           ▼
                    ┌──────────────┐
                    │  Frontend   │
                    │   State     │
                    └──────────────┘
```

### Query Decrement Flow
```
┌─────────┐         ┌──────────────┐         ┌──────────┐
│  User   │────────▶│ /api/debate │────────▶│ Upstash │
│ Starts  │ request │ /step        │ decrement│   KV    │
│ Debate  │         └──────────────┘         └──────────┘
└─────────┘                │
                           │ { reply, remaining }
                           ▼
                    ┌──────────────┐
                    │  Frontend   │
                    │   Update    │
                    │   Count     │
                    └──────────────┘
```

---

## 9. Recommendations

### Immediate Fixes (Priority: Critical)

1. **Move Master Token to Environment Variable**
   - Create `ADMIN_ACCESS_CODE` env var
   - Update 3 files to use `process.env.ADMIN_ACCESS_CODE`
   - Keep fallback to `"6969"` for backward compatibility (with warning)

2. **Add Query Verification on Frontend**
   - Poll `/api/auth/verify` every 30 seconds when logged in
   - Update `queriesRemaining` state
   - Refresh display

3. **Disable Inputs When Queries Exhausted**
   - Add check in `PromptInput` component
   - Pass `queriesRemaining` prop
   - Disable input and show message when `queriesRemaining === 0`

### Short-term Improvements (Priority: High)

4. **Add Query Check Before Starting Debate**
   - Pre-validate in `handleStartDebate`
   - Show message before API call

5. **Better Error Messages**
   - When queries exhausted: "You have used all your queries. Please contact administrator for more."
   - When token disabled: "This access code has been deactivated."

6. **Move KV Credentials to Environment**
   - Store `KV_URL` and `KV_TOKEN` in `.env.local`
   - Remove from source code

### Long-term Enhancements (Priority: Medium)

7. **Add Token Expiration**
   - Add `expires_at` field to tokens
   - Validate on each use
   - Auto-disable expired tokens

8. **Atomic Decrement Operation**
   - Use Redis `HINCRBY` for atomic decrement
   - Prevents race conditions

9. **Rate Limiting**
   - Add rate limiting middleware
   - Limit login attempts, verification calls

10. **Query History Logging**
    - Log each query decrement with timestamp
    - Add `last_used_at` to token data
    - Useful for debugging

---

## 10. Implementation Plan

### Phase 1: Critical Fixes (Week 1)
1. Environment variable for admin token
2. Frontend query verification (polling)
3. Disable inputs when queries exhausted
4. Better error messages

### Phase 2: Security Hardening (Week 2)
1. Move KV credentials to environment
2. Add rate limiting
3. Atomic decrement operations

### Phase 3: UX Enhancements (Week 3)
1. Pre-check queries before API call
2. Visual indicators for query status
3. Query history display

### Phase 4: Advanced Features (Week 4)
1. Token expiration
2. Query usage analytics
3. Admin dashboard for token management

---

## 11. Testing Checklist

### Test Cases to Verify

- [ ] Master token (6969) grants unlimited access
- [ ] Generated token grants limited queries
- [ ] Queries decrement correctly on debate start
- [ ] Queries decrement correctly on oracle analysis
- [ ] Login fails when queries = 0
- [ ] Debate start fails when queries = 0
- [ ] Oracle fails when queries = 0
- [ ] Frontend shows correct query count after login
- [ ] Frontend updates query count after API calls
- [ ] Frontend polls and refreshes query count
- [ ] Inputs disable when queries exhausted
- [ ] Error messages display correctly
- [ ] Token can be disabled via admin API
- [ ] Multiple tabs sync query count
- [ ] Page refresh maintains auth state

---

## 12. Code References

### Key Files Modified
- `src/app/api/auth/login/route.ts` - Login logic
- `src/app/api/auth/verify/route.ts` - Verification endpoint
- `src/app/api/debate/step/route.ts` - Debate with quota check
- `src/app/api/debate/oracle/route.ts` - Oracle with quota check
- `src/app/api/admin/generate-codes/route.ts` - Token generation
- `src/app/api/verify-code/route.ts` - Code verification
- `src/app/page.tsx` - Main page with query display
- `src/components/AccessCodeModal.tsx` - Login modal
- `src/components/PromptInput.tsx` - Input component (needs update)
- `src/hooks/useDebate.ts` - Debate hook with query tracking

---

## Conclusion

The access token system is **functionally working** but has **critical UX and security gaps**:

1. ✅ **Working:** Token generation, storage, validation, decrementing
2. ⚠️ **Gaps:** No periodic verification, no UI feedback on exhaustion
3. ❌ **Risks:** Hardcoded tokens, no expiration, exposed credentials

**Recommended Action:** Implement Phase 1 fixes immediately to improve UX and security.

