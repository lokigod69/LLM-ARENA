# 🔍 Level 1 Truncation Investigation Report

**Date:** Investigation Report  
**Status:** 🔍 Investigation Complete - Analysis Ready

---

## OBSERVED BEHAVIOR

### Problem: GPT-5 Nano Truncates Mid-Sentence at Level 1
- **User sets:** Slider at 1 (concise mode)
- **Expected:** Brief response (1-3 sentences) that completes naturally
- **Actual:** Response gets cut off mid-sentence
- **Model:** GPT-5 Nano (but likely affects all GPT-5 models)

### User's Question:
> "Should we restart to this and just leave it as a cut-off mid-sentence, which is for me that kind of imperfect design. But on the other hand I don't want to mess too much now with the system prompts."

---

## CURRENT IMPLEMENTATION ANALYSIS

### Token Limits for Level 1

**Location:** `src/lib/orchestrator.ts`, lines 83-98

```typescript
function getMaxTokensForExtensiveness(extensivenessLevel: number = 3): number {
  switch (Math.round(extensivenessLevel)) {
    case 1:
      return 120;  // Target: ≤80 tokens (~45 words) + buffer to finish sentence
    case 2:
      return 250;  // Target: ~200 tokens (2-3 sentences) + 50 buffer
    case 3:
      return 330;  // Target: ~280 tokens (3-4 sentences) + 50 buffer
    case 4:
      return 450;  // Target: ~400 tokens (4-5 sentences) + 50 buffer
    case 5:
      return 600;  // Target: ~550 tokens (6-7 sentences) + 50 buffer
    default:
      return 330;
  }
}
```

**Analysis:**
- Level 1: **120 tokens max** (target: ≤80 tokens, ~45 words)
- Buffer: ~40 tokens to finish sentence
- **Problem:** 120 tokens is quite small - models might start a thought and hit the limit mid-sentence

---

### GPT-5 Models All Use Same Logic

**Location:** `src/lib/orchestrator.ts`, lines 1469-1499

**Key Finding:** GPT-5, GPT-5 Mini, and GPT-5 Nano all:
1. Route to the same `callOpenAIResponses` function
2. Use the same Responses API (`/v1/responses`)
3. Use the same `getMaxTokensForExtensiveness` function
4. Use the same `verbosity` parameter mapping

**Verbosity Mapping:**
```typescript
function getVerbosityLevel(extensivenessLevel?: number): 'low' | 'medium' | 'high' {
  if (!extensivenessLevel) return 'medium';
  if (extensivenessLevel <= 2) return 'low';      // Level 1-2 = low
  if (extensivenessLevel <= 4) return 'medium';   // Level 3-4 = medium
  return 'high';                                   // Level 5 = high
}
```

**Analysis:**
- Level 1 uses `verbosity: 'low'` (soft guidance)
- Level 1 uses `max_output_tokens: 120` (hard limit)
- **Problem:** `verbosity` is soft guidance - models might still generate longer thoughts and hit the hard limit

---

### First Turn Instructions for Level 1

**Location:** `src/lib/orchestrator.ts`, lines 793-798

```typescript
const firstTurnInstructions = effectiveExtensiveness <= 2
  ? `3. FIRST TURN INSTRUCTIONS (Extensiveness Level ${Math.round(effectiveExtensiveness)}):
• Be concise and direct - ${effectiveExtensiveness === 1 ? '1-3 sentences maximum' : '2-3 sentences'}
• Present ${effectiveExtensiveness === 1 ? 'one decisive' : '2-3 essential'} argument${effectiveExtensiveness === 1 ? '' : 's'}
• Skip prefaces and introductions - get straight to your point
• Establish your core thesis clearly and briefly`
  : // ... other levels
```

**Analysis:**
- Level 1 says: "1-3 sentences maximum"
- But doesn't explicitly say: "You MUST finish within the token limit"
- Models might try to write 2-3 sentences but hit the 120-token limit mid-sentence

---

### Extensiveness Instructions for Level 1

**Location:** `src/lib/orchestrator.ts`, lines 700-730 (estimated)

**Need to check:** What does `getExtensivenessInstructions(1)` return?

**Expected:** Should say something like "Be extremely concise" but might not explicitly warn about token limits

---

### Finish Reason Logging

**Location:** `src/lib/orchestrator.ts`, lines 1428-1445

```typescript
console.log('🔍 GPT-5 Responses API finish_reason:', {
  finishReason: finishReason || 'UNKNOWN',
  maxOutputTokens: maxTokens,
  replyLength: reply.length,
  wasTruncated: finishReason === 'length' || finishReason === 'max_tokens' || finishReason === 'MAX_TOKENS'
});

if (tokenUsage) {
  console.log('🔍 Token usage vs. limit:', {
    outputTokens: tokenUsage.outputTokens,
    maxOutputTokens: maxTokens,
    percentageUsed: maxTokens > 0 ? ((tokenUsage.outputTokens / maxTokens) * 100).toFixed(1) + '%' : 'N/A',
    finishReason: finishReason || 'UNKNOWN',
    extensivenessLevel: extensivenessLevel || 'NOT PROVIDED'
  });
}
```

**Analysis:**
- We already log `finish_reason` - can check if truncation is happening
- If `finish_reason === 'length'` or `'max_tokens'`, response was truncated
- If `finish_reason === 'stop'`, model chose to stop naturally

---

## ROOT CAUSE ANALYSIS

### Issue #1: Token Limit Too Small for Natural Completion

**Problem:** 120 tokens for level 1 might be too small for models to:
1. Start a thought
2. Develop it slightly
3. Finish the sentence naturally

**Evidence:**
- Comment says "Target: ≤80 tokens (~45 words) + buffer to finish sentence"
- But 40-token buffer might not be enough if model starts a longer sentence

---

### Issue #2: Models Don't Know They Must Finish Within Limit

**Problem:** System prompt says "1-3 sentences maximum" but doesn't explicitly say:
- "You MUST finish your response within the token limit"
- "If you're approaching the limit, finish your current sentence and stop"
- "Do not start new sentences if you're near the limit"

**Impact:** Models might:
1. Start writing 2-3 sentences
2. Hit the 120-token limit mid-sentence
3. Get cut off abruptly

---

### Issue #3: Verbosity Parameter is Soft Guidance

**Problem:** `verbosity: 'low'` is soft guidance, not a hard limit:
- Models might still generate longer thoughts
- They rely on `max_output_tokens` as the hard limit
- But they don't know to stop BEFORE hitting the limit

---

### Issue #4: No Explicit "Finish Within Limit" Instruction

**Problem:** Unlike level 5 which says "academic depth", level 1 doesn't say:
- "You have a strict token limit - finish your thought within it"
- "If you're near the limit, conclude immediately"
- "Do not exceed the token limit"

---

## COMPARISON: GPT-5 vs GPT-5 Nano vs GPT-5 Mini

### All Use Same Logic ✅

**Finding:** All GPT-5 models (GPT-5, GPT-5 Mini, GPT-5 Nano) use:
- Same `callOpenAIResponses` function
- Same `getMaxTokensForExtensiveness` function
- Same `verbosity` mapping
- Same Responses API

**Conclusion:** If GPT-5 Nano truncates at level 1, GPT-5 and GPT-5 Mini will likely do the same.

---

## POSSIBLE SOLUTIONS

### Solution A: Add Explicit "Finish Within Limit" Instruction (Recommended)

**Approach:** Add explicit instruction for level 1:
- "You have a strict token limit of ~80 tokens (~45 words)"
- "You MUST finish your response within this limit"
- "If you're approaching the limit, conclude your current sentence and stop immediately"
- "Do not start new sentences if you're near the limit"

**Pros:**
- Models might learn to self-limit better
- More natural completion (models finish sentences before hitting limit)
- Minimal code changes

**Cons:**
- Might not work perfectly (models still might hit limit)
- Adds complexity to system prompt

---

### Solution B: Increase Token Limit for Level 1

**Approach:** Increase level 1 from 120 to 150-180 tokens:
- Gives more buffer for natural completion
- Models can finish 1-3 sentences without truncation

**Pros:**
- Simple fix - just change one number
- More reliable natural completion

**Cons:**
- Level 1 becomes less "concise" (might generate longer responses)
- Defeats the purpose of level 1 being "extremely concise"

---

### Solution C: Accept Mid-Sentence Truncation (Current Behavior)

**Approach:** Leave as-is, accept that level 1 might truncate mid-sentence

**Pros:**
- No code changes needed
- Level 1 stays truly concise (120 tokens)

**Cons:**
- Poor user experience (mid-sentence cutoffs look broken)
- User already identified this as "imperfect design"

---

### Solution D: Hybrid Approach

**Approach:** Combine Solution A + slight token increase:
- Add explicit "finish within limit" instruction
- Increase level 1 from 120 to 140 tokens (small increase)
- Models get better guidance AND more buffer

**Pros:**
- Best of both worlds
- More reliable completion
- Still keeps level 1 concise

**Cons:**
- Two changes instead of one

---

## RECOMMENDATION

### Option 1: Add Explicit Instruction (Low Risk, High Value) ⭐

**Implementation:**
- Add explicit "finish within token limit" instruction for level 1
- Keep token limit at 120
- Test if models self-limit better

**Risk:** Low - only adds instruction, doesn't change token limits

---

### Option 2: Hybrid Approach (Medium Risk, Highest Value)

**Implementation:**
- Add explicit "finish within token limit" instruction
- Increase level 1 from 120 to 140 tokens (small increase)
- Test if this provides better completion

**Risk:** Medium - changes both instruction and token limit

---

### Option 3: Accept Current Behavior (No Risk, Low Value)

**Implementation:**
- Leave as-is
- Document that level 1 might truncate mid-sentence

**Risk:** None - no changes

---

## VERIFICATION PLAN

### Step 1: Check Current finish_reason Logs

**Action:** Review console logs for GPT-5 Nano at level 1:
- Is `finish_reason === 'length'` or `'max_tokens'`? (truncated)
- Is `finish_reason === 'stop'`? (natural stop)
- What percentage of `maxOutputTokens` was used?

**Expected:** If truncating, should see `finish_reason === 'length'` and `percentageUsed === 100%`

---

### Step 2: Test Solution A (Instruction Only)

**Action:** Add explicit "finish within limit" instruction, test:
- Does GPT-5 Nano finish sentences naturally?
- Does it still truncate mid-sentence?
- What's the `finish_reason`?

**Success Criteria:** `finish_reason === 'stop'` (natural completion) more often

---

### Step 3: Test Solution D (Hybrid)

**Action:** Add instruction + increase to 140 tokens, test:
- Does GPT-5 Nano finish sentences naturally?
- Is response still concise (1-3 sentences)?
- What's the `finish_reason`?

**Success Criteria:** `finish_reason === 'stop'` AND response is still concise

---

## QUESTIONS TO ANSWER

1. **Is truncation happening?** Check `finish_reason` logs
2. **Is it GPT-5 Nano specific?** Test GPT-5 and GPT-5 Mini at level 1
3. **Can instruction fix it?** Test Solution A first (low risk)
4. **Do we need token increase?** If instruction alone doesn't work, try Solution D

---

**Status:** ✅ Investigation Complete - Awaiting User Decision on Solution Approach

