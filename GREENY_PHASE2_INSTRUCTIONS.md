# 🟢 GREENY: PHASE 2 IMPLEMENTATION INSTRUCTIONS

**From:** Claude (Strategic Partner)  
**To:** Greeny (Cursor Coding Agent)  
**Date:** November 22, 2025  
**Status:** ✅ PHASE 1 APPROVED — PROCEED TO PHASE 2

---

## 📊 PHASE 1 REVIEW

**Verdict:** Excellent work, Greeny. All security hardening tasks completed successfully.

**Confirmed Complete:**
- ✅ `.env.local.example` created
- ✅ `auth-config.ts` shared utility implemented
- ✅ Default admin code fallback removed
- ✅ `/api/debug-env` deleted
- ✅ Debug endpoints protected
- ✅ Sensitive logging removed

**Security Posture:** 🟢 SECURE — Ready for beta

---

## 🎯 PHASE 2: PAYMENT SYSTEM

### Overview

We're implementing a tiered payment system with Stripe. Saya has made the following business decisions:

### Tier Structure (FINAL)

| Tier | Price | Debates/Month | Chats/Month | Models | TTS | Model Selection |
|------|-------|---------------|-------------|--------|-----|-----------------|
| **Free** | $0 | 5 | 10 sessions | Budget only | ❌ Browser TTS | Hidden |
| **Basic** | $5/month | 30 | 50 sessions | Mid-tier | On-demand | Hidden (smart routing) |
| **Pro** | $15/month | 100 | 200 sessions | All models | Unlimited | Visible |

### Model Tiers (Internal Classification)

| Tier | Models | Used For |
|------|--------|----------|
| **Budget** | Kimi 8K/32K/128K, Gemini Flash-Lite, DeepSeek V3 | Free tier |
| **Mid-tier** | Claude Haiku, Gemini Flash, Grok 4 Fast, Qwen Plus | Basic tier |
| **Premium** | Claude Sonnet, GPT-5 Mini, Gemini Pro, Grok 4 | Pro tier |
| **Ultra** | GPT-5, GPT-5 Nano (reasoning) | Pro tier only |

### Chat Session Limits

- **Messages per session:** 10 messages max (5 user + 5 AI responses)
- **Session end:** Graceful ending message ("Thank you for chatting! Start a new session to continue.")
- **Quota:** Each chat session counts as 1 against monthly limit
- **Context:** No summarization needed — session just ends at 10 messages

---

## 📋 PHASE 2 TASK LIST

### Part A: Investigation (Do First)
**Autonomy:** 🟢 FULL  
**Time:** 2-3 hours

### Task 2.1: Stripe Setup Investigation
**Deliverable:** Understanding of what we need to implement

**Research:**
```
1. What Stripe packages do we need?
   - stripe (server SDK)
   - @stripe/stripe-js (client SDK) — maybe not needed for checkout redirect

2. What Stripe features do we need?
   - Checkout Sessions (redirect to Stripe-hosted page)
   - Webhooks (payment confirmation)
   - Customer Portal (subscription management) — maybe later

3. What are the minimum API routes needed?
   - /api/stripe/create-checkout — creates checkout session
   - /api/stripe/webhook — handles payment events
   - /api/stripe/portal — customer portal link (optional)
```

### Task 2.2: Database Schema Design
**Deliverable:** Schema proposal for storing subscription data

**Current State:**
```typescript
// Current: Upstash KV
// Key: token:{accessCode}
{
  queries_allowed: string,
  queries_remaining: string,
  isActive: string,
  created_at: string
}
```

**Proposed Additions:**
```typescript
// Option A: Extend KV with subscription data
// Key: user:{stripeCustomerId}
{
  email: string,
  tier: 'free' | 'basic' | 'pro',
  subscription_id: string,
  current_period_end: string,
  debates_remaining: string,
  chats_remaining: string,
  created_at: string
}

// Option B: Use Supabase for subscription data
// Table: subscriptions
{
  id: uuid,
  stripe_customer_id: string,
  stripe_subscription_id: string,
  email: string,
  tier: 'free' | 'basic' | 'pro',
  debates_remaining: integer,
  chats_remaining: integer,
  current_period_end: timestamp,
  created_at: timestamp
}
```

**Investigate and recommend:** Which approach is better given current architecture?

### Task 2.3: Current Token System Analysis
**Deliverable:** How to integrate subscriptions with existing system

**Questions to answer:**
1. Should we keep access codes for beta testers alongside Stripe?
2. How do we link Stripe customer to our system?
3. Do we need email collection? (Stripe requires for receipts)
4. Should free tier require signup or be anonymous?

---

### Part B: Implementation
**Autonomy:** 🟡 CHECK after investigation, then 🟢 FULL for implementation  
**Time:** 4-6 hours

### Task 2.4: Install Stripe SDK
```bash
npm install stripe
```

**Environment Variables to Add:**
```bash
# Add to .env.local.example
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Task 2.5: Create Stripe Checkout Route
**File:** `src/app/api/stripe/create-checkout/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia', // Use latest
});

// Price IDs from Stripe Dashboard
const PRICE_IDS = {
  basic: 'price_xxx', // $5/month
  pro: 'price_yyy',   // $15/month
};

export async function POST(request: NextRequest) {
  try {
    const { tier, email } = await request.json();
    
    if (!tier || !['basic', 'pro'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email, // Optional: pre-fill email
      line_items: [
        {
          price: PRICE_IDS[tier as keyof typeof PRICE_IDS],
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/purchase/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/purchase/cancel`,
      metadata: {
        tier,
      },
    });
    
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout' }, { status: 500 });
  }
}
```

### Task 2.6: Create Webhook Handler
**File:** `src/app/api/stripe/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { kv } from '@vercel/kv'; // Or your KV import

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const TIER_LIMITS = {
  basic: { debates: 30, chats: 50 },
  pro: { debates: 100, chats: 200 },
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleSuccessfulPayment(session);
      break;
    }
    
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription);
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCancelled(subscription);
      break;
    }
    
    case 'invoice.payment_succeeded': {
      // Monthly renewal - reset quotas
      const invoice = event.data.object as Stripe.Invoice;
      await handleRenewal(invoice);
      break;
    }
  }
  
  return NextResponse.json({ received: true });
}

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const tier = session.metadata?.tier as 'basic' | 'pro';
  const limits = TIER_LIMITS[tier];
  
  // Create/update user subscription in KV
  await kv.hset(`subscription:${customerId}`, {
    email: session.customer_email,
    tier,
    subscription_id: session.subscription,
    debates_remaining: limits.debates,
    chats_remaining: limits.chats,
    created_at: new Date().toISOString(),
  });
  
  // Generate access token for this subscription
  const accessToken = `sub_${customerId.slice(-8)}`;
  await kv.hset(`token:${accessToken}`, {
    stripe_customer_id: customerId,
    tier,
    queries_remaining: String(limits.debates + limits.chats),
    queries_allowed: String(limits.debates + limits.chats),
    isActive: 'true',
    created_at: new Date().toISOString(),
  });
  
  console.log(`Subscription created for ${customerId}, tier: ${tier}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  // Handle plan changes
  console.log(`Subscription ${subscription.id} updated`);
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Downgrade to free tier
  await kv.hset(`subscription:${customerId}`, {
    tier: 'free',
    debates_remaining: '5',
    chats_remaining: '10',
  });
  
  console.log(`Subscription cancelled for ${customerId}`);
}

async function handleRenewal(invoice: Stripe.Invoice) {
  // Reset monthly quotas
  const customerId = invoice.customer as string;
  const subscription = await kv.hgetall(`subscription:${customerId}`);
  
  if (subscription) {
    const tier = subscription.tier as 'basic' | 'pro';
    const limits = TIER_LIMITS[tier];
    
    await kv.hset(`subscription:${customerId}`, {
      debates_remaining: limits.debates,
      chats_remaining: limits.chats,
    });
    
    console.log(`Monthly quotas reset for ${customerId}`);
  }
}
```

### Task 2.7: Create Purchase Pages
**Files:**
- `src/app/purchase/page.tsx` — Pricing page with tier cards
- `src/app/purchase/success/page.tsx` — Success confirmation
- `src/app/purchase/cancel/page.tsx` — Cancellation page

**Purchase Page Structure:**
```tsx
// src/app/purchase/page.tsx
// Matrix-themed pricing cards showing:
// - Free tier (current access code system)
// - Basic tier ($5/month) with "Subscribe" button
// - Pro tier ($15/month) with "Subscribe" button

// On click: POST to /api/stripe/create-checkout
// Then redirect to session.url
```

### Task 2.8: Update AccessCodeModal
**File:** `src/components/AccessCodeModal.tsx`

**Add:**
- Link to purchase page: "Don't have a code? [Subscribe here](/purchase)"
- Or: Separate "Get Access" button that shows pricing options

### Task 2.9: Implement Chat Session Limits
**File:** `src/app/chat/[sessionId]/page.tsx` (or relevant chat component)

**Add:**
```typescript
const MAX_MESSAGES_PER_SESSION = 10;

// In chat component:
const canSendMessage = messages.length < MAX_MESSAGES_PER_SESSION;

if (!canSendMessage) {
  // Show end message
  return (
    <div className="text-matrix-green text-center p-4">
      <p>Thank you for chatting with {persona.name}!</p>
      <p>This session has ended. Start a new session to continue.</p>
      <Link href="/chat">
        <button className="mt-4 px-4 py-2 bg-matrix-green/20 hover:bg-matrix-green/30 rounded">
          Start New Chat
        </button>
      </Link>
    </div>
  );
}
```

### Task 2.10: Implement Model Routing by Tier
**File:** `src/lib/model-routing.ts` (NEW)

```typescript
const MODEL_TIERS = {
  budget: [
    'moonshot-v1-8k',
    'moonshot-v1-32k', 
    'moonshot-v1-128k',
    'gemini-2.5-flash-lite',
    'deepseek-v3',
  ],
  mid: [
    'claude-haiku-4-5-20251001',
    'gemini-2.5-flash',
    'grok-4-fast',
    'qwen-plus',
  ],
  premium: [
    'claude-3-5-sonnet-20241022',
    'gpt-5-mini',
    'gemini-2.5-pro-preview-05-06',
    'grok-4-fast-reasoning',
  ],
  ultra: [
    'gpt-5',
    'gpt-5-nano',
  ],
};

const TIER_MODEL_ACCESS = {
  free: ['budget'],
  basic: ['budget', 'mid'],
  pro: ['budget', 'mid', 'premium', 'ultra'],
};

export function getDefaultModel(userTier: 'free' | 'basic' | 'pro'): string {
  // Smart routing - pick best value model for tier
  switch (userTier) {
    case 'free':
      return 'moonshot-v1-128k'; // Best budget model
    case 'basic':
      return 'claude-haiku-4-5-20251001'; // Best mid-tier
    case 'pro':
      return 'claude-3-5-sonnet-20241022'; // Best premium
  }
}

export function canUseModel(userTier: string, modelId: string): boolean {
  const allowedTiers = TIER_MODEL_ACCESS[userTier as keyof typeof TIER_MODEL_ACCESS] || [];
  
  for (const tierName of allowedTiers) {
    const models = MODEL_TIERS[tierName as keyof typeof MODEL_TIERS];
    if (models.includes(modelId)) return true;
  }
  
  return false;
}

export function getAvailableModels(userTier: string): string[] {
  const allowedTiers = TIER_MODEL_ACCESS[userTier as keyof typeof TIER_MODEL_ACCESS] || [];
  const models: string[] = [];
  
  for (const tierName of allowedTiers) {
    const tierModels = MODEL_TIERS[tierName as keyof typeof MODEL_TIERS];
    models.push(...tierModels);
  }
  
  return models;
}
```

---

## 🔄 WORKFLOW

### Step 1: Investigation (2-3 hours)
1. Research Stripe setup requirements
2. Analyze current token system
3. Design schema proposal
4. **Create:** `GREENY_PHASE2_INVESTIGATION_REPORT.md`
5. **STOP** — Share report for review

### Step 2: Review & Approval
- Claude/Saya review investigation
- Approve schema design
- Confirm approach

### Step 3: Implementation (4-6 hours)
1. Install Stripe SDK
2. Add env vars to `.env.local.example`
3. Create checkout route
4. Create webhook handler
5. Create purchase pages
6. Update AccessCodeModal
7. Implement chat limits
8. Implement model routing
9. **Create:** `GREENY_PHASE2_IMPLEMENTATION_REPORT.md`

---

## 📝 INVESTIGATION REPORT TEMPLATE

**Create:** `GREENY_PHASE2_INVESTIGATION_REPORT.md`

```markdown
# 🔍 GREENY PHASE 2 INVESTIGATION REPORT

## Stripe Setup Analysis
- Required packages: [list]
- API routes needed: [list]
- Webhook events to handle: [list]

## Schema Recommendation
- [ ] Option A: Extend KV
- [ ] Option B: Use Supabase
- **Recommended:** [choice] because [reasons]

## Integration with Current System
- Access codes: [keep/replace/alongside]
- Email collection: [required/optional/approach]
- Free tier: [anonymous/signup required]

## Questions for Saya
- [Any remaining questions]

## Implementation Plan
- [Ordered list of tasks]
- [Time estimates]

## Risks & Considerations
- [Any potential issues]
```

---

## ⏱️ TIME ESTIMATES

| Task | Time |
|------|------|
| 2.1-2.3 Investigation | 2-3 hours |
| Review checkpoint | — |
| 2.4 Install Stripe | 15 min |
| 2.5 Checkout route | 1 hour |
| 2.6 Webhook handler | 1.5 hours |
| 2.7 Purchase pages | 1.5 hours |
| 2.8 Update AccessCodeModal | 30 min |
| 2.9 Chat limits | 30 min |
| 2.10 Model routing | 1 hour |
| **Total** | **8-10 hours** |

---

## 🚦 GO SIGNAL

**Status:** ✅ **APPROVED TO PROCEED**

Start with the **Investigation phase** (Tasks 2.1-2.3). Create the investigation report and share with Saya before moving to implementation.

**Key Decision Points:**
- Schema design (KV vs Supabase)
- Integration approach (keep access codes alongside Stripe?)
- Any Stripe-specific questions

---

## 📌 IMPORTANT NOTES

### Stripe Test Mode
- Use `sk_test_` and `pk_test_` keys during development
- Create test products/prices in Stripe Dashboard
- Test webhooks with Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Vercel Integration
- Stripe webhooks need to be configured in Stripe Dashboard
- Use Vercel's preview URLs for testing webhooks
- Production webhook URL: `https://your-domain.com/api/stripe/webhook`

### Free Tier Handling
- Free tier users don't go through Stripe
- They use existing access code system OR
- Anonymous usage with IP-based limiting (simpler)
- **Decision needed:** How to handle free tier?

---

**Good luck with Phase 2, Greeny! 🚀**

Start with the investigation and report back.
