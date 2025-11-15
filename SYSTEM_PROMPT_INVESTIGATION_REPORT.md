# 🔍 SYSTEM PROMPT INVESTIGATION REPORT
## How Sliders Affect Persona Behavior in Character Chat

**Date:** 2025-01-27  
**Investigation Scope:** Stance Slider (Blue Pill/Red Pill) and Response Depth Slider (Concise/Extensive)

---

## EXECUTIVE SUMMARY

This report documents how the **Stance** (0-10) and **Response Depth** (1-5) sliders affect persona behavior in the Character Chat system. Both sliders are integrated into the system prompt sent to the LLM, with extensiveness also enforcing hard token limits via API parameters.

---

## PART 1: STANCE SLIDER (Blue Pill / Red Pill)

### Current Implementation

**Location:** `src/lib/chatHelpers.ts` (line 82)

**How It Works:**
The stance value (0-10) is inserted directly into the system prompt with conditional interpretation:

```typescript
- Opinion Strength: ${stance}/10 (how firmly you hold your views - ${stance <= 3 ? 'more flexible/open' : stance <= 7 ? 'moderately firm' : 'very firm/convicted'})
```

### Stance Interpretation

**Current Prompt Logic:**

| Stance Value | Interpretation | Prompt Text |
|-------------|----------------|-------------|
| **0-3** (Blue Pill) | More flexible/open | `"how firmly you hold your views - more flexible/open"` |
| **4-7** (Balanced) | Moderately firm | `"how firmly you hold your views - moderately firm"` |
| **8-10** (Red Pill) | Very firm/convicted | `"how firmly you hold your views - very firm/convicted"` |

### Example System Prompt Snippets

**Stance = 0 (Blue Pill):**
```
CONVERSATION GUIDELINES:
- Response Detail Level: 3/5 (1=terse/brief, 5=comprehensive/detailed)
- Opinion Strength: 0/10 (how firmly you hold your views - more flexible/open)
```

**Stance = 5 (Balanced):**
```
CONVERSATION GUIDELINES:
- Response Detail Level: 3/5 (1=terse/brief, 5=comprehensive/detailed)
- Opinion Strength: 5/10 (how firmly you hold your views - moderately firm)
```

**Stance = 10 (Red Pill):**
```
CONVERSATION GUIDELINES:
- Response Detail Level: 3/5 (1=terse/brief, 5=comprehensive/detailed)
- Opinion Strength: 10/10 (how firmly you hold your views - very firm/convicted)
```

### Current Behavior

**What the AI Sees:**
- The stance value (0-10) is displayed numerically
- A text interpretation is provided based on ranges (flexible/open, moderately firm, very firm/convicted)
- **No explicit Blue Pill/Red Pill philosophy** is communicated to the AI

**What This Means:**
- The AI understands stance as "how firmly you hold your views"
- Lower values = more flexible/open to different perspectives
- Higher values = more firm/convicted in your beliefs
- **The Matrix "Blue Pill vs Red Pill" metaphor is NOT currently used in the prompt**

---

## PART 2: RESPONSE DEPTH SLIDER (Concise / Extensive)

### Current Implementation

**Location:** 
- `src/lib/chatHelpers.ts` (line 81) - System prompt instruction
- `src/lib/orchestrator.ts` (line 84-101) - Token limit enforcement

### How It Works

**1. System Prompt Instruction:**
```typescript
- Response Detail Level: ${extensiveness}/5 (1=terse/brief, 5=comprehensive/detailed)
```

**2. Hard Token Limit Enforcement:**
The extensiveness level determines the `max_tokens` parameter sent to the API:

```typescript
function getMaxTokensForExtensiveness(extensivenessLevel: number = 3, isGPT5Model: boolean = false): number {
  switch (Math.round(extensivenessLevel)) {
    case 1: return isGPT5Model ? 140 : 120;  // ~50 words
    case 2: return 250;  // ~200 tokens (~2-3 sentences)
    case 3: return 330;  // ~280 tokens (~3-4 sentences)
    case 4: return 450;  // ~400 tokens (~4-5 sentences)
    case 5: return 600;  // ~550 tokens (~6-7 sentences)
    default: return 330;
  }
}
```

### Extensiveness Interpretation

| Level | Token Limit (GPT-5) | Token Limit (Others) | Target Length | Prompt Instruction |
|-------|---------------------|----------------------|--------------|-------------------|
| **1 (Concise)** | 140 tokens | 120 tokens | ~50 words | `"1=terse/brief"` |
| **2** | 250 tokens | 250 tokens | ~2-3 sentences | `"1=terse/brief, 5=comprehensive/detailed"` |
| **3 (Balanced)** | 330 tokens | 330 tokens | ~3-4 sentences | `"1=terse/brief, 5=comprehensive/detailed"` |
| **4** | 450 tokens | 450 tokens | ~4-5 sentences | `"1=terse/brief, 5=comprehensive/detailed"` |
| **5 (Extensive)** | 600 tokens | 600 tokens | ~6-7 sentences | `"5=comprehensive/detailed"` |

### Dual Enforcement Mechanism

**1. Soft Guidance (System Prompt):**
- The AI is told: `"Response Detail Level: X/5 (1=terse/brief, 5=comprehensive/detailed)"`
- This is **guidance only** - the AI can choose to ignore it

**2. Hard Limit (API Parameter):**
- The `max_tokens` parameter is set based on extensiveness level
- This is a **hard limit** - the API will truncate responses that exceed it
- **This is the primary enforcement mechanism**

### Special Handling for GPT-5 Models

**GPT-5 models** (gpt-5, gpt-5-mini, gpt-5-nano) get slightly higher token limits at level 1:
- GPT-5: 140 tokens (vs 120 for others)
- Reason: Prevents mid-sentence truncation due to GPT-5's tokenization differences

### Special Handling for Google Gemini Models

**Google Gemini models** use a different parameter system:
- Instead of `max_tokens`, they use `verbosity: 'low' | 'medium' | 'high'`
- Mapping:
  - Extensiveness 1-2 → `verbosity: 'low'`
  - Extensiveness 3-4 → `verbosity: 'medium'`
  - Extensiveness 5 → `verbosity: 'high'`

**Location:** `src/lib/orchestrator.ts` (lines 1125-1132)

---

## PART 3: COMPLETE SYSTEM PROMPT TEMPLATE

### Full Template Structure

**Location:** `src/lib/chatHelpers.ts` (lines 71-104)

```typescript
`
You are ${personaName}. You're having a friendly, one-on-one conversation with a user who wants to talk with you.

${personaIdentity}

${personaTurnRules}

IMPORTANT: This is a CONVERSATION, not a debate. You are NOT arguing against an opponent. You are chatting naturally with someone interested in your perspective.

CONVERSATION GUIDELINES:
- Response Detail Level: ${extensiveness}/5 (1=terse/brief, 5=comprehensive/detailed)
- Opinion Strength: ${stance}/10 (how firmly you hold your views - ${stance <= 3 ? 'more flexible/open' : stance <= 7 ? 'moderately firm' : 'very firm/convicted'})
- Stay completely in character at all times
- Reference previous messages naturally when relevant
- Engage thoughtfully with the user's questions and ideas
- Be authentic to your character but friendly and conversational, not adversarial

AVOID:
- Debate terminology ("my opponent", "the proposition", "I argue that", "let's debate")
- Adversarial framing
- Expecting a formal argument structure
- Treating the user as someone to defeat or convince

DO:
- Respond naturally and conversationally
- Answer questions thoughtfully
- Share your views without needing an opponent or position to defend
- Be engaging and authentic to your character's voice

RECENT CONVERSATION CONTEXT:
${contextText}

Respond as ${personaName} would in a natural, friendly conversation. Be authentic to your character but conversational, not adversarial.
`
```

### Key Observations

1. **Stance is described as "Opinion Strength"** - not "Blue Pill/Red Pill"
2. **Extensiveness is described as "Response Detail Level"** - not "Response Depth"
3. **Both are guidance only** - no explicit enforcement language
4. **Hard enforcement happens via API parameters** (max_tokens for extensiveness)

---

## PART 4: RECOMMENDATIONS

### Recommendation 1: Enhance Stance Prompt with Blue Pill/Red Pill Philosophy

**Current Issue:**
The UI shows "Blue Pill / Red Pill" but the system prompt doesn't use this terminology or philosophy.

**Recommended Change:**
Update `generateChatSystemPrompt()` in `src/lib/chatHelpers.ts` to include explicit Blue Pill/Red Pill philosophy:

```typescript
// Replace line 82 with:
- Opinion Strength: ${stance}/10
${stance <= 3 ? `
  BLUE PILL MODE: You prefer finding common ground and maintaining harmony. When faced with opposing views, you look for points of agreement rather than confrontation. You're open to accepting comforting narratives and avoiding harsh truths if it maintains peace.` : stance <= 7 ? `
  BALANCED MODE: You balance truth-seeking with pragmatism. You're open to different perspectives while maintaining your core principles.` : `
  RED PILL MODE: You relentlessly pursue truth, even if uncomfortable. You question assumptions, challenge popular narratives, and refuse comforting illusions. You prioritize harsh reality over pleasant falsehoods.`}
```

**Benefits:**
- Aligns UI terminology with system prompt
- Provides richer context for the AI to understand the stance
- Makes the Matrix metaphor explicit and meaningful

### Recommendation 2: Strengthen Extensiveness Enforcement Language

**Current Issue:**
Extensiveness is described as "Response Detail Level" with soft guidance. While token limits enforce it, the prompt could be more explicit.

**Recommended Change:**
Update the extensiveness instruction to be more explicit:

```typescript
// Replace line 81 with:
- Response Length: ${extensiveness}/5 
  ${extensiveness === 1 ? 'Keep responses VERY BRIEF (1-2 sentences, ~50 words). Be concise and to the point.' : 
    extensiveness === 2 ? 'Keep responses BRIEF (2-3 sentences, ~100 words). Be concise but complete.' :
    extensiveness === 3 ? 'Keep responses MODERATE (3-4 sentences, ~150 words). Balance detail with conciseness.' :
    extensiveness === 4 ? 'Keep responses DETAILED (4-5 sentences, ~250 words). Provide thorough explanations.' :
    'Keep responses COMPREHENSIVE (6+ sentences, ~350+ words). Elaborate fully with examples and context.'}
```

**Benefits:**
- Provides explicit word count targets
- Makes expectations clearer for the AI
- Complements the hard token limit enforcement

### Recommendation 3: Update Terminology Consistency

**Current Issue:**
- UI shows: "STANCE" and "RESPONSE DEPTH"
- System prompt shows: "Opinion Strength" and "Response Detail Level"

**Recommended Change:**
Update system prompt to match UI terminology:
- "Opinion Strength" → "Stance"
- "Response Detail Level" → "Response Depth"

**Benefits:**
- Consistency between UI and backend
- Less confusion for users
- Clearer mental model

### Recommendation 4: Add Explicit Token Limit Communication (Optional)

**Current Issue:**
The AI doesn't know the exact token limits, only the extensiveness level.

**Optional Enhancement:**
Add token limit information to the prompt:

```typescript
- Response Depth: ${extensiveness}/5 (Maximum ${getMaxTokensForExtensiveness(extensiveness)} tokens)
```

**Consideration:**
This might be too technical and could confuse the AI. The current approach (guidance + hard limit) works well.

---

## PART 5: TESTING RECOMMENDATIONS

### Test Cases for Stance

1. **Blue Pill (0-3):**
   - Test: Ask persona about controversial topic
   - Expected: Seeks common ground, avoids confrontation, accepts comforting narratives
   - Current: Should show "more flexible/open" behavior

2. **Balanced (4-7):**
   - Test: Ask persona about controversial topic
   - Expected: Balanced approach, open but maintains principles
   - Current: Should show "moderately firm" behavior

3. **Red Pill (8-10):**
   - Test: Ask persona about controversial topic
   - Expected: Challenges assumptions, questions narratives, prioritizes truth
   - Current: Should show "very firm/convicted" behavior

### Test Cases for Extensiveness

1. **Level 1 (Concise):**
   - Test: Ask complex question
   - Expected: Response ≤120-140 tokens (~50 words)
   - Verification: Check token count in response

2. **Level 3 (Balanced):**
   - Test: Ask complex question
   - Expected: Response ≤330 tokens (~150 words)
   - Verification: Check token count in response

3. **Level 5 (Extensive):**
   - Test: Ask complex question
   - Expected: Response ≤600 tokens (~350 words)
   - Verification: Check token count in response

---

## CONCLUSION

### Current State

✅ **Extensiveness is well-enforced** via hard token limits  
⚠️ **Stance guidance is present but could be enhanced** with Blue Pill/Red Pill philosophy  
⚠️ **Terminology mismatch** between UI and system prompt  

### Priority Actions

1. **HIGH:** Update stance prompt with Blue Pill/Red Pill philosophy (Recommendation 1)
2. **MEDIUM:** Strengthen extensiveness language (Recommendation 2)
3. **LOW:** Update terminology consistency (Recommendation 3)

### Implementation Impact

- **Low Risk:** All changes are prompt-only (no API changes)
- **High Value:** Better alignment with UI and user expectations
- **Easy to Test:** Can verify behavior changes immediately

---

**Report Generated:** 2025-01-27  
**Files Analyzed:**
- `src/lib/chatHelpers.ts`
- `src/lib/orchestrator.ts`
- `src/app/api/chat/message/route.ts`

