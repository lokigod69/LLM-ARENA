# Access Token System - Improvement Plan

**Status:** Ready for Implementation  
**Based on:** ACCESS_TOKEN_INVESTIGATION.md findings

---

## Summary of Issues Found

1. ❌ **Master token hardcoded** in 3 files (security risk)
2. ⚠️ **No periodic query verification** (stale frontend state)
3. ⚠️ **No UI feedback** when queries exhausted (poor UX)
4. ⚠️ **Inputs remain enabled** when queries = 0 (confusing)
5. ⚠️ **KV credentials in source code** (security risk)

---

## Proposed Implementation Plan

### Phase 1: Critical Fixes (Do First)

#### 1.1 Move Master Token to Environment Variable

**Files to Modify:**
- `src/app/api/auth/login/route.ts`
- `src/app/api/verify-code/route.ts`
- `src/app/api/admin/generate-codes/route.ts`

**Changes:**
```typescript
// Before:
const ADMIN_ACCESS_CODE = "6969";

// After:
const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || "6969";
if (!process.env.ADMIN_ACCESS_CODE) {
  console.warn("⚠️ ADMIN_ACCESS_CODE not set, using default '6969'");
}
```

**Environment Setup:**
Add to `.env.local`:
```
ADMIN_ACCESS_CODE=your-secret-admin-code-here
```

---

#### 1.2 Add Periodic Query Verification

**File to Modify:** `src/app/page.tsx`

**Changes:**
Add useEffect hook that polls `/api/auth/verify` every 30 seconds:

```typescript
useEffect(() => {
  if (!isUnlocked || queriesRemaining === 'Unlimited') return;
  
  const interval = setInterval(async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.mode === 'token' && data.remaining !== undefined) {
          setQueriesRemaining(data.remaining);
        }
      }
    } catch (error) {
      console.error('Failed to verify queries:', error);
    }
  }, 30000); // Every 30 seconds
  
  return () => clearInterval(interval);
}, [isUnlocked, queriesRemaining]);
```

---

#### 1.3 Disable Inputs When Queries Exhausted

**File to Modify:** `src/app/page.tsx`

**Changes:**
1. Pass `queriesRemaining` to `PromptInput`:
```typescript
<PromptInput 
  onSubmitTopic={handleStartDebate}
  onStop={stopDebate}
  isLoading={isModelALoading || isModelBLoading}
  isDebateActive={isDebateActive}
  queriesRemaining={queriesRemaining}
  isAdmin={typeof queriesRemaining === 'string' && queriesRemaining === 'Unlimited'}
/>
```

2. In `handleStartDebate`, add pre-check:
```typescript
const handleStartDebate = async (newTopic: string) => {
  if (!isUnlocked) {
    alert("Access not verified. Please enter a valid access code.");
    return;
  }
  
  // Pre-check queries
  if (typeof queriesRemaining === 'number' && queriesRemaining <= 0) {
    alert("No queries remaining. Please contact administrator for more access.");
    return;
  }
  
  console.log("New debate topic submitted:", newTopic);
  await startDebate(newTopic);
};
```

**File to Modify:** `src/components/PromptInput.tsx`

**Changes:**
1. Add props:
```typescript
interface PromptInputProps {
  onSubmitTopic: (topic: string) => void;
  onStop: () => void;
  isLoading: boolean;
  isDebateActive: boolean;
  queriesRemaining?: number | string; // NEW
  isAdmin?: boolean; // NEW
}
```

2. Disable input when queries exhausted:
```typescript
const isQueriesExhausted = typeof queriesRemaining === 'number' && queriesRemaining <= 0 && !isAdmin;

<textarea
  // ... existing props
  disabled={isLoading || isDebateActive || isQueriesExhausted}
/>

{isQueriesExhausted && (
  <p className="text-red-500 text-sm mt-2 text-center">
    ⚠️ No queries remaining. Please contact administrator.
  </p>
)}
```

---

#### 1.4 Better Error Messages

**File to Modify:** `src/hooks/useDebate.ts`

**Changes:**
In `getLLMResponse` error handling:

```typescript
if (!response.ok) {
  const errorData = await response.json();
  
  if (response.status === 403 && errorData.error?.includes('queries remaining')) {
    // Update queries to 0
    setQueriesRemaining(0);
    throw new Error('No queries remaining. Please contact administrator for more access.');
  }
  
  // ... existing error handling
}
```

---

#### 1.5 Move KV Credentials to Environment

**Files to Modify:**
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/verify/route.ts`
- `src/app/api/debate/step/route.ts`
- `src/app/api/debate/oracle/route.ts`
- `src/app/api/admin/generate-codes/route.ts`
- `src/app/api/verify-code/route.ts`

**Changes:**
```typescript
// Before:
const KV_URL = "https://touching-stallion-7895.upstash.io";
const KV_TOKEN = "AR7XAAImcDIxNTc0YzFkMTg5MDE0NmVkYmZhNDZjZDY1MjVhMzNiOHAyNzg5NQ";

// After:
const KV_URL = process.env.KV_REST_API_URL || process.env.KV_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.KV_TOKEN;

if (!KV_URL || !KV_TOKEN) {
  throw new Error('KV credentials not configured');
}
```

**Environment Setup:**
Add to `.env.local`:
```
KV_REST_API_URL=https://touching-stallion-7895.upstash.io
KV_REST_API_TOKEN=your-kv-token-here
```

---

### Phase 2: Security Hardening

#### 2.1 Atomic Decrement Operations

**File to Modify:** `src/app/api/debate/step/route.ts`

**Current Implementation:**
```typescript
// Non-atomic: Read, decrement, write
const data = await kv(['HGETALL', `token:${accessToken}`]);
const currentRemaining = Number(tokenData.queries_remaining || 0);
const newRemaining = currentRemaining - 1;
await kv(['HSET', `token:${accessToken}`, 'queries_remaining', String(newRemaining)]);
```

**Improved Implementation:**
```typescript
// Atomic: Use HINCRBY for atomic decrement
const result = await kv(['HINCRBY', `token:${accessToken}`, 'queries_remaining', '-1']);
const newRemaining = result;

// Check if we went negative (race condition)
if (newRemaining < 0) {
  // Rollback by incrementing back
  await kv(['HINCRBY', `token:${accessToken}`, 'queries_remaining', '1']);
  return NextResponse.json({ error: 'No queries remaining' }, { status: 403 });
}
```

**Note:** Apply same change to `src/app/api/debate/oracle/route.ts`

---

#### 2.2 Add Rate Limiting

**Option:** Use Next.js middleware or external service (e.g., Upstash Rate Limit)

**Simple Implementation:**
```typescript
// In each route handler
const rateLimitKey = `rate_limit:${accessToken || 'anonymous'}:${Date.now() - (Date.now() % 60000)}`;
const rateLimitCount = await kv(['GET', rateLimitKey]) || 0;

if (rateLimitCount > 10) { // 10 requests per minute
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
}

await kv(['SET', rateLimitKey, String(rateLimitCount + 1), 'EX', '60']);
```

---

### Phase 3: UX Enhancements

#### 3.1 Visual Query Status Indicator

**File to Modify:** `src/app/page.tsx`

**Changes:**
```typescript
// In header, add visual indicator
<div className="flex items-center gap-2">
  <p className="text-xs text-matrix-green-dim">QUERIES REMAINING</p>
  {typeof queriesRemaining === 'number' && (
    <div className={`w-2 h-2 rounded-full ${
      queriesRemaining > 3 ? 'bg-green-500' :
      queriesRemaining > 0 ? 'bg-yellow-500' :
      'bg-red-500'
    }`} />
  )}
  <p className="text-sm text-matrix-text font-matrix">{queriesRemaining}</p>
</div>
```

---

#### 3.2 Query Usage Progress Bar

**Add to header:**
```typescript
{typeof queriesRemaining === 'number' && (
  <div className="w-32 h-1 bg-gray-700 rounded-full overflow-hidden">
    <div 
      className="h-full bg-matrix-green transition-all"
      style={{ width: `${(queriesRemaining / allowed) * 100}%` }}
    />
  </div>
)}
```

---

### Phase 4: Advanced Features (Optional)

#### 4.1 Token Expiration

**File to Modify:** `src/app/api/admin/generate-codes/route.ts`

**Changes:**
```typescript
await kv(['HSET', `token:${id}`,
  'queries_allowed', String(queries),
  'queries_remaining', String(queries),
  'isActive', 'true',
  'created_at', new Date().toISOString(),
  'expires_at', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
]);
```

**Validate in login/step/oracle:**
```typescript
if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
  return NextResponse.json({ error: 'Access token has expired' }, { status: 403 });
}
```

---

## Implementation Order

### Week 1: Critical Fixes (Must Do)
1. ✅ Environment variable for admin token
2. ✅ Periodic query verification
3. ✅ Disable inputs when queries exhausted
4. ✅ Better error messages
5. ✅ Move KV credentials to environment

### Week 2: Security Hardening
1. Atomic decrement operations
2. Rate limiting
3. Security audit

### Week 3: UX Enhancements
1. Visual indicators
2. Progress bars
3. User feedback improvements

### Week 4: Advanced Features (If Needed)
1. Token expiration
2. Query history
3. Admin dashboard

---

## Testing Plan

### Unit Tests
- [ ] Admin token from environment variable
- [ ] Query decrementing atomic operations
- [ ] Rate limiting prevents abuse
- [ ] Token expiration validation

### Integration Tests
- [ ] Login flow with valid token
- [ ] Login flow with exhausted token
- [ ] Query count updates correctly
- [ ] Frontend polls and refreshes
- [ ] Inputs disable when queries = 0
- [ ] Error messages display correctly

### Manual Testing
- [ ] Generate token with admin code
- [ ] Login with generated token
- [ ] Start debate (queries decrement)
- [ ] Oracle analysis (queries decrement)
- [ ] Query count updates in UI
- [ ] Inputs disable at 0 queries
- [ ] Multiple tabs sync correctly
- [ ] Page refresh maintains state

---

## Rollback Plan

If issues arise:

1. **Keep old code commented** in files
2. **Feature flags** for new behavior
3. **Gradual rollout** (test on staging first)
4. **Environment variables** allow quick disable

---

## Success Criteria

✅ **Security:**
- No hardcoded credentials in source code
- Tokens validated on every request
- Rate limiting prevents abuse

✅ **User Experience:**
- Query count always accurate
- Clear feedback when queries exhausted
- Inputs disabled appropriately

✅ **Reliability:**
- No race conditions in query decrementing
- State syncs across tabs/sessions
- Error handling prevents crashes

---

## Next Steps

1. Review this plan with team
2. Prioritize Phase 1 items
3. Create feature branch
4. Implement changes incrementally
5. Test thoroughly before merge
6. Deploy to staging first
7. Monitor for issues
8. Deploy to production

---

## Notes

- All changes are **backward compatible** where possible
- Environment variables have **fallbacks** for development
- **No breaking changes** to existing API contracts
- **Gradual improvement** approach (not big bang)

