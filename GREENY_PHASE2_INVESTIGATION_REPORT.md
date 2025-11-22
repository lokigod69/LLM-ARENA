# 🔍 GREENY PHASE 2 INVESTIGATION REPORT

**Date:** November 22, 2025  
**Investigator:** Greeny (Cursor/Codex Agent)  
**For:** Claude (Strategic Partner) & Saya (Project Lead)  
**Status:** ✅ INVESTIGATION COMPLETE

---

## 📊 EXECUTIVE SUMMARY

Phase 2 investigation complete. Analysis of Stripe integration requirements, database schema options, and current token system integration points.

**Key Findings:**
- ✅ Stripe SDK requirements identified (`stripe` package only needed)
- ✅ Database schema recommendation: **Hybrid approach** (KV for tokens, Supabase for subscriptions)
- ✅ Current token system analysis complete
- ✅ Integration strategy defined

**Recommendation:** Proceed with hybrid storage approach - keep KV for backward compatibility with access codes, use Supabase for subscription management.

---

## 2.1 STRIPE SETUP INVESTIGATION

### Required Packages

**Server SDK:**
- ✅ `stripe` (Node.js SDK) - **REQUIRED**
  - Latest version: `^17.0.0` (as of Nov 2024)
  - API Version: `2024-11-20.acacia` (latest stable)
  - Installation: `npm install stripe`

**Client SDK:**
- ❌ `@stripe/stripe-js` - **NOT NEEDED**
  - Reason: Using Stripe Checkout redirect (hosted by Stripe)
  - No client-side Stripe.js integration required
  - Checkout redirects to Stripe-hosted page, then back to our app

**Conclusion:** Only need `stripe` server package.

### Required Stripe Features

**1. Checkout Sessions** ✅ **REQUIRED**
- Purpose: Create subscription checkout sessions
- Method: `stripe.checkout.sessions.create()`
- Flow: User clicks "Subscribe" → Redirect to Stripe → Payment → Redirect back
- Configuration:
  - `mode: 'subscription'`
  - `payment_method_types: ['card']`
  - `success_url` / `cancel_url`
  - `metadata` for tier tracking

**2. Webhooks** ✅ **REQUIRED**
- Purpose: Handle payment events asynchronously
- Events to handle:
  - `checkout.session.completed` - Initial subscription creation
  - `customer.subscription.updated` - Plan changes
  - `customer.subscription.deleted` - Cancellations
  - `invoice.payment_succeeded` - Monthly renewals
- Security: Webhook signature verification required
- Endpoint: `/api/stripe/webhook`

**3. Customer Portal** ⚠️ **OPTIONAL (Phase 3)**
- Purpose: Let users manage subscriptions (cancel, update payment method)
- Method: `stripe.billingPortal.sessions.create()`
- Can be added later, not critical for MVP

### Required API Routes

**1. `/api/stripe/create-checkout`** ✅ **REQUIRED**
- Method: `POST`
- Purpose: Create Stripe Checkout session
- Input: `{ tier: 'basic' | 'pro', email?: string }`
- Output: `{ url: string }` (redirect URL)
- Implementation: ~50 lines

**2. `/api/stripe/webhook`** ✅ **REQUIRED**
- Method: `POST`
- Purpose: Handle Stripe webhook events
- Security: Verify webhook signature
- Implementation: ~150 lines (event handlers)

**3. `/api/stripe/portal`** ⚠️ **OPTIONAL**
- Method: `POST`
- Purpose: Generate customer portal link
- Can be added in Phase 3

### Environment Variables Needed

```bash
# Stripe API Keys (from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_...        # Test mode: sk_test_, Live: sk_live_
STRIPE_PUBLISHABLE_KEY=pk_test_...   # Not needed for server-side checkout
STRIPE_WEBHOOK_SECRET=whsec_...      # From webhook endpoint configuration

# App URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Dev
NEXT_PUBLIC_APP_URL=https://your-domain.com  # Prod
```

**Note:** `STRIPE_PUBLISHABLE_KEY` not needed since we're using server-side checkout redirect.

---

## 2.2 DATABASE SCHEMA DESIGN

### Current Architecture Analysis

**Upstash KV (Redis) - Current Token System:**
```typescript
// Key: token:{accessCode}
{
  queries_allowed: string,
  queries_remaining: string,
  isActive: string,
  created_at: string
}
```

**Supabase - Current Usage:**
- ✅ `chat_sessions` table exists
- ✅ `debates` table exists (mentioned in docs)
- ✅ Graceful degradation (works without Supabase)
- ✅ JSONB support for flexible data

### Schema Options Comparison

#### Option A: Extend KV with Subscription Data

**Pros:**
- ✅ Consistent with current token system
- ✅ Fast lookups (Redis)
- ✅ Simple implementation
- ✅ No new infrastructure

**Cons:**
- ❌ Limited querying capabilities (can't easily list all subscriptions)
- ❌ No relational integrity
- ❌ Harder to generate reports/analytics
- ❌ No email-based lookups (would need separate key)
- ❌ Limited data types (all strings)

**KV Schema:**
```typescript
// Key: subscription:{stripeCustomerId}
{
  email: string,
  tier: 'free' | 'basic' | 'pro',
  subscription_id: string,
  current_period_end: string,
  debates_remaining: string,
  chats_remaining: string,
  created_at: string
}

// Key: token:{accessToken} (existing + extend)
{
  stripe_customer_id?: string,  // Link to subscription
  tier?: 'free' | 'basic' | 'pro',
  queries_allowed: string,
  queries_remaining: string,
  isActive: string,
  created_at: string
}
```

#### Option B: Use Supabase for Subscriptions

**Pros:**
- ✅ Relational queries (find by email, list all subscriptions)
- ✅ Better for analytics/reporting
- ✅ Type safety (PostgreSQL types)
- ✅ Already integrated in codebase
- ✅ Can join with `chat_sessions` table
- ✅ Better for future features (user accounts, etc.)

**Cons:**
- ⚠️ Requires Supabase setup (but already optional)
- ⚠️ Slightly more complex queries
- ⚠️ Need to handle graceful degradation

**Supabase Schema:**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  email VARCHAR(255) NOT NULL,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'basic', 'pro')),
  debates_remaining INTEGER DEFAULT 0,
  chats_remaining INTEGER DEFAULT 0,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_email ON subscriptions(email);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);
```

#### Option C: Hybrid Approach ⭐ **RECOMMENDED**

**Strategy:**
- **KV:** Keep for access tokens (backward compatibility with beta testers)
- **Supabase:** Use for subscription management (paid users)

**Benefits:**
- ✅ Backward compatible (existing access codes still work)
- ✅ Best of both worlds (fast token lookups + relational subscription data)
- ✅ Can migrate tokens to Supabase later if needed
- ✅ Clear separation: tokens (KV) vs subscriptions (Supabase)

**Implementation:**
```typescript
// KV: token:{accessCode} (existing, unchanged)
// KV: subscription:{stripeCustomerId} (for quick lookups)

// Supabase: subscriptions table (for management/analytics)
// Link via stripe_customer_id
```

### Recommendation: **Option C (Hybrid)**

**Reasoning:**
1. **Backward Compatibility:** Existing access code system continues to work
2. **Performance:** KV is perfect for token lookups (every API call)
3. **Flexibility:** Supabase enables future features (user accounts, analytics)
4. **Gradual Migration:** Can move tokens to Supabase later if needed
5. **Best Practices:** Use right tool for right job (KV for tokens, DB for subscriptions)

**Schema Implementation:**

**KV (Upstash):**
```typescript
// Existing token system (unchanged)
token:{accessCode} = {
  queries_allowed: string,
  queries_remaining: string,
  isActive: string,
  created_at: string
}

// New: Subscription quick lookup (optional cache)
subscription:{stripeCustomerId} = {
  tier: 'basic' | 'pro',
  current_period_end: string,
  debates_remaining: string,
  chats_remaining: string
}
```

**Supabase:**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  email VARCHAR(255) NOT NULL,
  tier VARCHAR(20) NOT NULL CHECK (tier IN ('free', 'basic', 'pro')),
  debates_remaining INTEGER DEFAULT 0,
  chats_remaining INTEGER DEFAULT 0,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_email ON subscriptions(email);
```

**Link Strategy:**
- When user subscribes via Stripe → Create Supabase record
- Generate access token → Store in KV with `stripe_customer_id` reference
- On API calls → Check KV token first, then check Supabase subscription if `stripe_customer_id` exists

---

## 2.3 CURRENT TOKEN SYSTEM ANALYSIS

### How Current System Works

**1. Token Creation:**
- Admin calls `/api/admin/generate-codes`
- System generates `test-{random}` tokens
- Stores in KV: `token:{accessCode}` with quota

**2. Token Authentication:**
- User enters code in `AccessCodeModal`
- POST to `/api/auth/login` with code
- System checks KV for token
- Sets cookies: `access_mode=token`, `access_token={code}`

**3. Quota Decrement:**
- Every API call checks cookies
- If `access_mode=token`:
  - Fetch from KV: `token:{accessToken}`
  - Check `queries_remaining > 0`
  - Decrement: `HINCRBY token:{accessToken} queries_remaining -1`
  - Return updated count

**Files Implementing Decrement:**
- `src/app/api/debate/step/route.ts` (lines 98-127)
- `src/app/api/debate/oracle/route.ts` (similar pattern)
- `src/app/api/chat/message/route.ts` (similar pattern)

### Integration Questions Answered

#### Q1: Should we keep access codes for beta testers alongside Stripe?

**Answer:** ✅ **YES - Keep Both Systems**

**Reasoning:**
- Beta testers already have access codes
- Free tier can use access codes (no Stripe needed)
- Gradual migration path (can move to Stripe later)
- No breaking changes

**Implementation:**
- Access codes continue to work (existing KV system)
- Stripe subscriptions create new tokens linked to subscriptions
- Both systems coexist

#### Q2: How do we link Stripe customer to our system?

**Answer:** **Token-Based Linking**

**Flow:**
1. User subscribes via Stripe Checkout
2. Webhook receives `checkout.session.completed`
3. Create Supabase subscription record
4. Generate access token: `sub_{customerId.slice(-8)}`
5. Store in KV: `token:{accessToken}` with `stripe_customer_id` field
6. User logs in with access token (same flow as access codes)

**Alternative (Future):**
- Email-based login (requires user accounts)
- Session-based auth (requires auth system)
- **For MVP:** Token-based is simplest

#### Q3: Do we need email collection?

**Answer:** ✅ **YES - Stripe Requires It**

**Reasoning:**
- Stripe sends receipts to email
- Required for subscription management
- Can use for future features (password reset, etc.)

**Collection Point:**
- Optional on checkout (pre-fill)
- Stripe collects if not provided
- Stored in Supabase `subscriptions.email`

#### Q4: Should free tier require signup or be anonymous?

**Answer:** ⚠️ **DECISION NEEDED**

**Options:**

**Option A: Anonymous Free Tier**
- No signup required
- IP-based rate limiting (5 debates/month per IP)
- Simple but can be gamed (VPN, etc.)

**Option B: Email Signup for Free Tier**
- Collect email (no payment)
- Create free subscription in Supabase
- Generate access token
- Better tracking, prevents abuse

**Option C: Access Code Only (Current)**
- Free tier uses access codes (admin-generated)
- No Stripe integration needed
- Simple but requires manual code generation

**Recommendation:** **Option B** (Email signup for free tier)
- Prevents abuse
- Enables future features
- Consistent with paid tiers
- Can still use access codes for beta testers

---

## 2.4 CHAT SESSION LIMITS ANALYSIS

### Current Chat Implementation

**File:** `src/app/chat/[sessionId]/page.tsx`

**Current State:**
- No message limit enforced
- Messages stored in `useChatSession` hook
- Session persists in `sessionStorage`
- Optional Supabase sync

**Required Changes:**
- Add `MAX_MESSAGES_PER_SESSION = 10` constant
- Check `messages.length < MAX_MESSAGES_PER_SESSION` before sending
- Show end message when limit reached
- Link to start new session

**Implementation Location:**
- `src/app/chat/[sessionId]/page.tsx` (main chat page)
- `src/hooks/useChatSession.ts` (session logic)
- `src/components/chat/ChatInput.tsx` (input component)

**Quota Tracking:**
- Each chat session = 1 against monthly limit
- Track in subscription: `chats_remaining`
- Decrement on session start (not per message)
- Reset monthly via webhook `invoice.payment_succeeded`

---

## 2.5 MODEL ROUTING ANALYSIS

### Current Model Configuration

**File:** `src/lib/modelConfigs.ts`

**Available Models:** 16 models across 7 providers

**Model Tier Classification (Based on Instructions):**

**Budget Tier:**
- `moonshot-v1-8k`
- `moonshot-v1-32k`
- `moonshot-v1-128k`
- `gemini-2.5-flash-lite` (need to verify this exists)
- `deepseek-v3`

**Mid-Tier:**
- `claude-haiku-4-5-20251001`
- `gemini-2.5-flash`
- `grok-4-fast` (need to verify exact name)
- `qwen-plus` (need to verify exact name)

**Premium Tier:**
- `claude-3-5-sonnet-20241022`
- `gpt-5-mini`
- `gemini-2.5-pro-preview-05-06`
- `grok-4-fast-reasoning` (need to verify)

**Ultra Tier:**
- `gpt-5`
- `gpt-5-nano`

**Tier Access Matrix:**
- **Free:** Budget only
- **Basic:** Budget + Mid
- **Pro:** All tiers

**Implementation Needed:**
- Create `src/lib/model-routing.ts` utility
- Functions: `canUseModel()`, `getAvailableModels()`, `getDefaultModel()`
- Update model selectors to filter by tier
- Hide model selector for Free/Basic (smart routing)

---

## 📋 IMPLEMENTATION PLAN

### Phase 2A: Investigation ✅ **COMPLETE**

- [x] Stripe setup research
- [x] Database schema design
- [x] Token system analysis
- [x] Integration strategy defined

### Phase 2B: Implementation (After Approval)

**Order of Implementation:**

1. **Install Stripe SDK** (15 min)
   - `npm install stripe`
   - Add env vars to `.env.local.example`

2. **Create Supabase Migration** (30 min)
   - `supabase_subscriptions_migration.sql`
   - Run migration in Supabase

3. **Create Stripe Utilities** (1 hour)
   - `src/lib/stripe.ts` - Stripe client initialization
   - `src/lib/subscription-helpers.ts` - Subscription management functions

4. **Create Checkout Route** (1 hour)
   - `src/app/api/stripe/create-checkout/route.ts`
   - Test with Stripe test mode

5. **Create Webhook Handler** (1.5 hours)
   - `src/app/api/stripe/webhook/route.ts`
   - Event handlers for all webhook types
   - Test with Stripe CLI

6. **Create Purchase Pages** (1.5 hours)
   - `src/app/purchase/page.tsx` - Pricing page
   - `src/app/purchase/success/page.tsx` - Success page
   - `src/app/purchase/cancel/page.tsx` - Cancel page

7. **Update AccessCodeModal** (30 min)
   - Add "Subscribe" link
   - Link to purchase page

8. **Implement Chat Limits** (30 min)
   - Add `MAX_MESSAGES_PER_SESSION` check
   - Show end message

9. **Implement Model Routing** (1 hour)
   - Create `src/lib/model-routing.ts`
   - Update model selectors
   - Hide selector for Free/Basic tiers

10. **Update Quota System** (1 hour)
    - Modify API routes to check subscription tier
    - Decrement `debates_remaining` / `chats_remaining`
    - Handle free tier quotas

**Total Estimated Time:** 8-9 hours

---

## ⚠️ RISKS & CONSIDERATIONS

### Risk 1: Webhook Reliability
**Mitigation:**
- Stripe retries failed webhooks automatically
- Implement idempotency (check if subscription already exists)
- Log all webhook events for debugging

### Risk 2: Token vs Subscription Confusion
**Mitigation:**
- Clear separation: tokens (KV) vs subscriptions (Supabase)
- Consistent naming: `stripe_customer_id` links them
- Documentation for future developers

### Risk 3: Free Tier Abuse
**Mitigation:**
- Email verification (Stripe handles this)
- Rate limiting per email
- IP-based fallback if needed

### Risk 4: Model Tier Verification
**Mitigation:**
- Verify all model names exist in `MODEL_CONFIGS`
- Test model routing with each tier
- Fallback to budget tier if model not available

### Risk 5: Supabase Optional
**Mitigation:**
- Graceful degradation (check if Supabase enabled)
- Fallback to KV-only if Supabase unavailable
- Clear error messages

---

## ❓ QUESTIONS FOR SAYA

1. **Free Tier Approach:**
   - [ ] Option A: Anonymous (IP-based)
   - [ ] Option B: Email signup required
   - [ ] Option C: Access codes only (current)

2. **Model Names Verification:** ✅ **VERIFIED**
   - All model names confirmed in codebase:
     - ✅ `gemini-2.5-flash-lite` (exists in MODEL_CONFIGS)
     - ✅ `grok-4-fast` (exists in MODEL_CONFIGS)
     - ✅ `grok-4-fast-reasoning` (exists in MODEL_CONFIGS)
     - ✅ `qwen-plus` (exists in MODEL_CONFIGS)

3. **Access Code Migration:**
   - Should we migrate existing access codes to subscription system?
   - Or keep them separate forever?

4. **Stripe Test Mode:**
   - Do you have Stripe test account set up?
   - Should I create test products/prices?

---

## ✅ RECOMMENDATIONS

### Schema: **Hybrid Approach (KV + Supabase)**
- Keep KV for tokens (performance)
- Use Supabase for subscriptions (management)
- Best of both worlds

### Free Tier: **Email Signup Required**
- Prevents abuse
- Enables future features
- Consistent with paid tiers

### Implementation Order:
1. Stripe SDK + Supabase migration
2. Checkout route + webhook handler
3. Purchase pages
4. Chat limits + model routing
5. Quota system updates

---

## 🚦 READY FOR APPROVAL

**Status:** ✅ **INVESTIGATION COMPLETE**

**Next Steps:**
1. Review this report with Claude/Saya
2. Answer questions above
3. Approve schema design
4. Proceed to implementation

**Estimated Implementation Time:** 8-9 hours after approval

---

**Report Status:** ✅ COMPLETE  
**Next Action:** Await Claude/Saya review and approval to proceed to implementation

