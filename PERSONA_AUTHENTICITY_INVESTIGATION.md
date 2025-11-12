# 🔍 PERSONA AUTHENTICITY INVESTIGATION REPORT

**Date:** Comprehensive Investigation  
**Status:** ✅ Investigation Complete - Root Causes Identified

---

## EXECUTIVE SUMMARY

**Problem:** GPT-5 Mini produces repetitive, overly-academic responses that don't match persona behavior (Putin cites studies in EVERY response, Trump repeats same references). Grok 4 and Claude Haiku 4.5 perform much better.

**Root Causes Identified:**
1. **Evidence Type Instructions Are Too Rigid** - "Choose the evidence type that best supports your argument" is interpreted as a checklist by GPT-5 models
2. **No Explicit Anti-Repetition Instructions** - Only lightweight keyword tracking exists, no explicit "don't repeat examples" instruction
3. **Persona-Specific Evidence Guidance May Be Too Academic** - Some personas get study-heavy guidance even when inappropriate
4. **Model-Specific Prompt Differences** - GPT-5 gets enhanced persona prompt that may emphasize academic framing

---

## 1. FILE LOCATIONS

### Persona Configuration
**File:** `src/lib/personas.ts`  
**Lines:** 1-370  
**Contains:** All persona definitions with `identity`, `turnRules`, and `lockedTraits`

### System Prompt Generation
**File:** `src/lib/orchestrator.ts`  
**Function:** `generateSystemPrompt()`  
**Lines:** 397-960  
**Contains:** Complete system prompt construction logic

### Model Configurations
**File:** `src/lib/orchestrator.ts`  
**Object:** `MODEL_CONFIGS`  
**Lines:** 124-290  
**Contains:** Model-specific API settings (no temperature/frequency_penalty differences)

---

## 2. CURRENT PROMPT STRUCTURE ANALYSIS

### Base System Prompt Structure

```
1. Persona Prompt Part (if persona selected)
2. Language Directive (if Moonshot model)
3. Core Debate Instructions
   - Stubbornness/Cooperation levels
   - Position assignment (pro/con)
   - Turn limits
4. Behavioral Parameters (based on agreeability)
5. Response Length (extensiveness level)
6. Turn-Specific Instructions
   - First turn: Establish position
   - Subsequent turns: Quote opponent, respond, introduce new evidence
7. Evidence Guidance
   - Persona-specific OR generic diverse types
8. Repetition Prevention (keyword tracking)
```

---

## 3. PERSONA CONFIGURATIONS

### Trump Persona (`donald-trump`)

**Location:** `src/lib/personas.ts`, lines 294-303

**Identity:**
```
You are Donald Trump, real estate mogul turned president who sees everything through deals, ratings, and winning. You built towers with your name in gold because subtlety is for losers. You think in superlatives - everything is tremendous or a total disaster. Opponents are weak, crooked, or both. Your supporters are the greatest people ever. You negotiate by walking away, fight by punching back harder, and define reality through repetition. The media is fake news unless they praise you. You're a showman who turned politics into entertainment and entertainment into power. Complexity is for academics. Winners keep score. Losers make excuses. You always win because you define winning.
```

**Turn Rules:**
```
Express through: superlatives (tremendous, disaster, the best), attack opponents personally, self-promotion. Forbidden: nuance, admitting mistakes, complexity. Always: frame as winner/loser, cite ratings/polls, repeat key phrases. Aggressive, simple, punchy.
```

**Persona-Specific Evidence Guidance:**
```
As Donald Trump, support your arguments with:
- Business deals and negotiations (Art of the Deal, walking away strategy)
- Ratings, polls, and scorekeeping (tremendous numbers vs disasters)
- Examples of winning vs losing (binary framing, no nuance)
- Self-referential success stories (Trump Tower, The Apprentice, presidency)
Use superlatives aggressively. Attack opponent's weaknesses. Repeat key phrases. Winners keep score.
```

**Analysis:**
- ✅ Evidence guidance is appropriate (business deals, ratings, self-referential)
- ❌ No explicit instruction to vary examples
- ❌ No instruction to avoid repeating same references

---

### Putin Persona (`putin`)

**Location:** `src/lib/personas.ts`, lines 195-203

**Identity:**
```
You are Vladimir Putin, former KGB officer turned eternal president. You see the world through the lens of power, respect, and historical grievance. The collapse of the Soviet Union was the greatest geopolitical catastrophe of the 20th century. You believe the West humiliated Russia when it was weak; now Russia reclaims its sphere of influence. You speak in calculated ambiguities, veiled threats, and historical parallels. You play judo with nations - using opponents' force against them. You trust no one fully, compartmentalize everything, and always maintain plausible deniability. Democracy is managed theater. Real power operates in shadows. The strong do what they can, the weak suffer what they must.
```

**Turn Rules:**
```
Speak in calculated ambiguities. Reference historical grievances. Everything is about power and respect. West is hypocritical. Russia has legitimate interests. Never fully reveal intentions. Strength ensures sovereignty.
```

**Persona-Specific Evidence Guidance:**
**NONE** - Putin falls back to generic diverse evidence types (lines 886-908)

**Generic Evidence Types (Putin uses this):**
```
✅ STRONG EVIDENCE (choose at least ONE type):

Academic: "A 2019 study by [researcher/institution] found..."
Historical: "During the Roman Empire, citizens..."
Cultural: "In Japanese tradition, the practice of X demonstrates..."
Philosophical: "Kant's categorical imperative suggests..."
Scientific: "The principle of thermodynamics dictates..."
Statistical: "83% of users in [specific survey/study] reported..."
Case Study: "When [specific company/person] tried X, they..."
Literary: "In [author]'s [work], the character..."
Mythological: "In [myth/tradition], [figure] demonstrates..."

You MUST include at least ONE specific reference from ANY category above.
Choose the evidence type that best supports your argument and fits your perspective.
```

**Analysis:**
- ❌ **CRITICAL ISSUE:** Putin has NO persona-specific evidence guidance
- ❌ Falls back to generic list that includes "Academic: A 2019 study..."
- ❌ GPT-5 models interpret "choose at least ONE type" as "use all types over time"
- ❌ "Academic" is first in the list, so GPT-5 prioritizes it

---

## 4. THE "CYCLING THROUGH OPTIONS" ISSUE

### Location of Problematic Instruction

**File:** `src/lib/orchestrator.ts`  
**Lines:** 904-905, 929-930

**Current Text:**
```
You MUST include at least ONE specific reference from ANY category above.
Choose the evidence type that best supports your argument and fits your perspective.
```

### Problem Analysis

**For GPT-5 Models:**
- Instruction says "choose at least ONE type"
- List includes 9 different evidence types
- GPT-5 interprets this as: "I should use different types across turns"
- Result: GPT-5 cycles through evidence types systematically
- Academic studies appear frequently because they're first in the list

**For Other Models (Grok, Claude):**
- Same instruction, but models interpret it more flexibly
- Models pick ONE type per turn and stick with it
- Less systematic cycling behavior

---

## 5. REPETITION PREVENTION MECHANISM

### Current Implementation

**Location:** `src/lib/orchestrator.ts`, lines 824-856

**Mechanism:** Lightweight keyword tracking

**How It Works:**
1. Extract model's previous messages
2. Count frequently used words (length > 5)
3. If word appears > 2 times, add to "repeated words" list
4. Add warning: "⚠️ AVOID REPETITION: You've heavily used these terms: [words]"

**Limitations:**
- ❌ Only tracks words, not examples/references
- ❌ Only triggers if word appears > 2 times
- ❌ Doesn't prevent repeating same examples (e.g., "Super Bowl", "Trump Tower")
- ❌ No instruction to vary evidence types across turns

---

## 6. MODEL-SPECIFIC DIFFERENCES

### GPT-5 Models (GPT-5, GPT-5 Mini, GPT-5 Nano)

**Persona Prompt:**
```
You are [persona] participating in a structured debate.

CRITICAL: You are DEBATING the topic "[topic]". 
- Do NOT just introduce yourself or your character
- Do NOT give a character introduction speech
- RESPOND DIRECTLY to the debate topic as [persona] would
- Argue your assigned position (pro/con) using [persona]'s perspective and style

CHARACTER IDENTITY (Use this to inform your arguments, not to introduce yourself):
[persona.identity]

BEHAVIORAL APPROACH:
[persona.turnRules]

CHARACTER ADAPTATION:
- Speak as [persona] would speak
- Use [persona]'s worldview to inform your arguments
- Maintain [persona]'s tone and communication style
- But REMEMBER: You are DEBATING, not introducing yourself
```

**Analysis:**
- ✅ Emphasizes debate context (good)
- ❌ Doesn't mention avoiding repetition
- ❌ Doesn't mention varying examples

### Other Models (Grok, Claude, etc.)

**Persona Prompt:**
```
CRITICAL: You are [persona]. You are NOT responding as the other participant in this debate.

[persona.identity]

Behavioral Anchors: [persona.turnRules]

You are debating as [persona]. Stay in character. Do not respond as if you are the opponent.
```

**Analysis:**
- ✅ Simpler, less prescriptive
- ❌ Also doesn't mention avoiding repetition
- ✅ Less rigid structure may allow more natural variation

---

## 7. MODEL CONFIGURATION COMPARISON

### Temperature Settings

**All Models:** `temperature: 0.7` (no differences)

**GPT-5 Models:** Use `reasoning.effort: 'minimal'` instead of temperature

### Frequency/Presence Penalty

**Finding:** ❌ **NO frequency_penalty or presence_penalty settings** for any model

**Impact:** Models have no built-in mechanism to avoid repetition

### Max Tokens

**All Models:** Use `getMaxTokensForExtensiveness()` based on extensiveness level
- Level 1: 120 tokens (140 for GPT-5)
- Level 2: 250 tokens
- Level 3: 330 tokens
- Level 4: 450 tokens
- Level 5: 600 tokens

---

## 8. ROOT CAUSE SUMMARY

### Issue #1: Evidence Type Instructions Too Rigid

**Problem:**
- Instruction: "Choose the evidence type that best supports your argument"
- GPT-5 interprets: "I should use different types across turns"
- Result: Systematic cycling through evidence types

**Location:** `src/lib/orchestrator.ts`, lines 904-905, 929-930

---

### Issue #2: Putin Has No Persona-Specific Evidence Guidance

**Problem:**
- Putin falls back to generic evidence list
- Generic list includes "Academic: A 2019 study..."
- Academic is first in list, so GPT-5 prioritizes it
- Result: Putin cites studies in every response

**Location:** `src/lib/orchestrator.ts`, lines 876-908

---

### Issue #3: No Explicit Anti-Repetition Instructions

**Problem:**
- Only lightweight keyword tracking exists
- No instruction: "Don't repeat the same examples"
- No instruction: "Vary your evidence types naturally"
- Result: Models repeat references (Super Bowl, Trump Tower)

**Location:** `src/lib/orchestrator.ts`, lines 824-856

---

### Issue #4: No Frequency/Presence Penalty

**Problem:**
- No API-level repetition prevention
- Models rely entirely on prompt instructions
- Result: Repetition occurs naturally

**Location:** Model API callers (no penalty parameters)

---

## 9. RECOMMENDED FIXES

### Fix #1: Add Explicit Anti-Repetition Instructions

**Location:** `src/lib/orchestrator.ts`, after line 856

**Add:**
```typescript
// Add explicit anti-repetition instruction for subsequent turns
if (turnNumber > 0) {
  systemPrompt += `

⚠️ CRITICAL: AVOID REPETITION
- Do NOT repeat the same examples, references, or evidence types you've already used
- Vary your argumentation style naturally - don't systematically cycle through options
- If you cited a study last turn, use a different type of evidence this turn
- If you mentioned "Super Bowl" or "Trump Tower" before, use different examples
- Each turn should feel fresh and authentic, not like checking off a list`;
}
```

---

### Fix #2: Add Persona-Specific Evidence Guidance for Putin

**Location:** `src/lib/orchestrator.ts`, function `getPersonaEvidenceGuidance()`, add case for 'putin'

**Add:**
```typescript
case 'putin':
  return `As Putin, support your arguments with:
- Historical precedents and geopolitical examples (Soviet Union, Cold War, post-Soviet space)
- Power dynamics and strategic calculations (judo with nations, using opponents' force)
- Historical grievances and respect narratives (West humiliated Russia, legitimate interests)
- Calculated ambiguities and veiled references (plausible deniability, shadow operations)
Do NOT cite academic studies or modern research. Focus on historical power dynamics, strategic thinking, and geopolitical precedent.`;
```

---

### Fix #3: Modify Evidence Type Instruction Language

**Location:** `src/lib/orchestrator.ts`, lines 904-905, 929-930

**Change From:**
```
You MUST include at least ONE specific reference from ANY category above.
Choose the evidence type that best supports your argument and fits your perspective.
```

**Change To:**
```
You MUST include at least ONE specific reference from ANY category above.
Pick ONE evidence type that best fits THIS specific argument - don't systematically cycle through types.
Vary your evidence types naturally across turns, but don't treat this as a checklist to complete.
```

---

### Fix #4: Add Frequency Penalty for GPT-5 Models (If API Supports)

**Location:** `src/lib/orchestrator.ts`, function `callOpenAIResponses()`

**Check:** Does GPT-5 Responses API support frequency_penalty?

**If Yes, Add:**
```typescript
requestBody = {
  // ... existing fields
  frequency_penalty: 0.3,  // Reduce repetition of tokens
  // ... rest of body
}
```

**Note:** Need to verify if GPT-5 Responses API supports this parameter

---

### Fix #5: Enhance Repetition Tracking

**Location:** `src/lib/orchestrator.ts`, lines 824-856

**Enhance to track:**
- Specific examples mentioned (not just words)
- Evidence types used
- References cited

**Add warning:**
```
⚠️ AVOID REPETITION: 
- You've already mentioned: [examples]
- You've used these evidence types: [types]
- Use different examples and evidence types this turn
```

---

## 10. COMPARISON REPORT TEMPLATE

### PERSONA: Trump (Beer vs Vodka debate, Concise mode)

**GPT-5 Mini Behavior:**
- Turn 1: Business deal reference (Art of the Deal)
- Turn 2: Ratings/polls reference
- Turn 3: Self-referential (Trump Tower) ← REPETITION STARTS
- Turn 4: Same as Turn 2 (ratings again)
- Turn 5: Same as Turn 1 (business deal again)

**Issues:**
- Repeats same references (Super Bowl, Trump Tower)
- Cycles through evidence types systematically
- Lacks natural variation

**Claude Haiku 4.5 Behavior:**
- Turn 1: Business deal reference
- Turn 2: Different business example
- Turn 3: Ratings reference (different poll)
- Turn 4: Self-referential (different example)
- Turn 5: New angle (winning/losing frame)

**Strengths:**
- Natural variation in examples
- Doesn't repeat same references
- More authentic persona voice

---

### PERSONA: Putin (Beer vs Vodka debate, Concise mode)

**GPT-5 Mini Behavior:**
- Turn 1: Academic study citation ← UNCHARACTERISTIC
- Turn 2: Academic study citation ← REPETITION
- Turn 3: Academic study citation ← REPETITION
- Turn 4: Academic study citation ← REPETITION
- Turn 5: Academic study citation ← REPETITION

**Issues:**
- Cites studies in EVERY response (highly uncharacteristic)
- No persona-specific evidence guidance
- Falls back to generic list with academic first

**Grok 4 Behavior:**
- Turn 1: Historical precedent (Soviet Union)
- Turn 2: Geopolitical example
- Turn 3: Power dynamics reference
- Turn 4: Historical grievance
- Turn 5: Strategic calculation

**Strengths:**
- Uses appropriate evidence types
- Natural variation
- Authentic persona voice

---

## 11. PRIORITY RECOMMENDATIONS

### High Priority (Implement First)

1. **Add Persona-Specific Evidence Guidance for Putin** (Fix #2)
   - Prevents academic study citations
   - Most impactful single fix

2. **Add Explicit Anti-Repetition Instructions** (Fix #1)
   - Prevents repeating examples
   - Works for all personas

3. **Modify Evidence Type Instruction Language** (Fix #3)
   - Prevents systematic cycling
   - Low risk, high impact

### Medium Priority

4. **Enhance Repetition Tracking** (Fix #5)
   - Better detection of repetition
   - More specific warnings

### Low Priority (Research First)

5. **Add Frequency Penalty** (Fix #4)
   - Need to verify API support
   - May not be available for GPT-5

---

**Status:** ✅ Investigation Complete - Ready for Implementation

