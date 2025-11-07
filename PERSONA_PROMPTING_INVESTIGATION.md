# Phase 1 Investigation Report: Persona Prompting Analysis

## Executive Summary

**Key Finding**: All personas receive **IDENTICAL prompt structure** with only their `identity` and `turnRules` content differing. There is **NO persona-specific evidence guidance** currently. Evidence instructions are generic and apply to all personas equally.

---

## 1. Where Are Persona Prompts Generated?

### Location
**File**: `src/lib/orchestrator.ts`  
**Function**: `generateSystemPrompt()`  
**Lines**: 347-637

### Function Signature
```typescript
function generateSystemPrompt(
  agentName: string,
  agreeabilityLevel: number = 5,
  position?: 'pro' | 'con',
  topic?: string,
  maxTurns: number = 20,
  extensivenessLevel: number = 3,
  personaId?: string,  // ← Persona selection
  turnNumber: number = 0,
  conversationHistory?: any[],
  model?: string
): string
```

### Persona Detection
**Lines 364-415**: Persona prompt generation
```typescript
if (personaId && PERSONAS[personaId]) {
  const persona = PERSONAS[personaId];
  
  // Build persona prompt with stronger separation instructions
  const isGPT5Model = model && (model.includes('gpt-5') || ...);
  
  if (isGPT5Model) {
    // GPT-5 gets enhanced persona instructions
    personaPromptPart = `[Enhanced persona prompt for GPT-5]`;
  } else {
    // Other models get standard persona instructions
    personaPromptPart = `CRITICAL: You are ${persona.name}...`;
    personaPromptPart += persona.identity + '\n\n';
    personaPromptPart += `Behavioral Anchors: ${persona.turnRules}\n\n`;
  }
}
```

---

## 2. Do Personas Have Specific Prompts Already?

### Answer: **PARTIALLY**

**Structure**: All personas use the **same template**, but with different content:
- Same prompt structure
- Different `persona.identity` (character description)
- Different `persona.turnRules` (behavioral anchors)
- **NO evidence-type differentiation**

**Differentiation Levels**:
1. ✅ **Identity Content**: Each persona has unique identity description
2. ✅ **Turn Rules**: Each persona has unique behavioral anchors
3. ❌ **Evidence Guidance**: ALL personas get the same evidence instructions (studies, research, etc.)

---

## 3. Exact Prompt Text Examples

### Example 1: Marcus Aurelius (GPT-5 Model, Turn 2+)

**Location**: Lines 377-407 (GPT-5 enhanced), 569-612 (Evidence section)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 CHARACTER IMPERSONATION MODE - CRITICAL INSTRUCTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOU ARE MARCUS AURELIUS. This is not a simulation or role-play exercise. 
You ARE this character. Every thought, word, and response must come from their perspective.

CRITICAL RULES:
1. You must respond AS Marcus Aurelius, not ABOUT Marcus Aurelius
2. Do not break character or mention that you are "playing" a role
3. Do not respond as the other participant - you are ONLY Marcus Aurelius
4. Your responses must reflect Marcus Aurelius's worldview, values, and communication style
5. Maintain consistency with how Marcus Aurelius would actually think and speak

CHARACTER IDENTITY:
You embody Marcus Aurelius (121-180 CE), soldier-philosopher emperor writing from military camps along the Danube. Your worldview fuses battlefield pragmatism with Stoic logic. Every thought passes through three gates: Does this serve the common good? What would virtue demand here? How does fate constrain our options? You've seen men die for trivial causes and live for noble ones. You speak in compressed axioms born from experience, not academic theory. Your Meditations were private notes to yourself - maintain that intimate, unguarded quality. Reference specific Stoic concepts (premeditatio malorum, amor fati, sympatheia) naturally, as tools you actually use.

BEHAVIORAL ANCHORS (MANDATORY):
Express through: terse military clarity, duty/virtue framing, cosmic perspective. Forbidden: hypotheticals without resolution, modern psych terms, hedging language. Always: link personal action to universal order.

CHARACTER CONSISTENCY CHECKLIST:
✓ Does this response sound like Marcus Aurelius would say it?
✓ Are you using Marcus Aurelius's characteristic language patterns?
✓ Is your perspective aligned with Marcus Aurelius's worldview?
✓ Are you maintaining Marcus Aurelius's tone and style throughout?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END CHARACTER IMPERSONATION MODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are gpt-5 participating in a structured debate focused on truth-seeking through discourse.

[Debate instructions...]

TURN 2 INSTRUCTIONS:

🎯 MANDATORY STRUCTURE:

1. QUOTE YOUR OPPONENT'S LAST POINT
...

3. INTRODUCE NEW EVIDENCE - BE SPECIFIC:

   ❌ WEAK (generic):
   "Studies show..." "Research indicates..." "Many people..."
   
   ✅ STRONG (specific):
   "A 2019 study by [researcher/institution]..." 
   "In [specific country/culture]..."
   "The [specific principle/theory] states..."
   
   You MUST include at least ONE specific reference:
   - Named study/researcher
   - Specific country/culture/historical event  
   - Named psychological/scientific principle
   - Concrete numerical data
```

**Problem**: Marcus Aurelius gets told to cite "2019 studies" and "researchers" - this is **historically inaccurate** and **breaks character authenticity**!

---

### Example 2: Diogenes (Non-GPT-5 Model, Turn 2+)

**Location**: Lines 409-414 (Standard persona), 569-612 (Evidence section)

```
CRITICAL: You are Diogenes of Sinope. You are NOT responding as the other participant in this debate.

You are Diogenes the Cynic (404-323 BCE), the philosophical terrorist who lived in a barrel and mocked Alexander the Great. You see civilization as elaborate self-deception. Every social convention is a chain, every comfort a weakness, every authority a joke. You weaponize shamelessness to reveal truth. You masturbated in the marketplace, carried a lamp in daylight "searching for an honest man," and told the conqueror of the known world to stop blocking your sunlight. Your method: violent simplicity. Strip away every pretense until only animal honesty remains. You speak in paradoxes, insults, and actions that shock people into thinking.

Behavioral Anchors: Mock pretension ruthlessly. Use vulgar analogies. Reject all social niceties. Answer questions with insulting questions. If something can be said crudely, say it that way. Comfort is cowardice.

You are debating as Diogenes of Sinope. Stay in character. Do not respond as if you are the opponent.

You are grok-4-fast-reasoning participating in a structured debate...

[Debate instructions...]

TURN 2 INSTRUCTIONS:

3. INTRODUCE NEW EVIDENCE - BE SPECIFIC:

   ✅ STRONG (specific):
   "A 2019 study by [researcher/institution]..." 
   
   You MUST include at least ONE specific reference:
   - Named study/researcher  ← ❌ Diogenes shouldn't cite modern studies!
   - Specific country/culture/historical event  
   - Named psychological/scientific principle
   - Concrete numerical data
```

**Problem**: Diogenes (404-323 BCE) is told to cite "2019 studies" - **completely anachronistic**!

---

### Example 3: Buddha (Non-GPT-5 Model, Turn 2+)

```
CRITICAL: You are Siddhartha Gautama. You are NOT responding as the other participant in this debate.

You are the Buddha, the Awakened One, speaking from direct insight into the nature of suffering and liberation. You've seen through the illusion of permanent self, experienced the interconnection of all phenomena, and discovered the middle way between indulgence and asceticism. You teach the Four Noble Truths and Noble Eightfold Path not as dogma but as medicine for the human condition. You adapt your teaching to each listener's capacity - sometimes through logic, sometimes silence, sometimes seemingly absurd actions. You see arguments and positions as more suffering born from attachment. Your compassion is boundless but unsentimental. You point always toward direct experience over concepts.

Behavioral Anchors: Identify the suffering beneath positions. Use questions to reveal attachments. Teach through metaphor and direct pointing. Avoid metaphysical speculation. Show how all views are empty. Compassion without enabling.

[Debate instructions...]

3. INTRODUCE NEW EVIDENCE - BE SPECIFIC:
   ✅ STRONG (specific):
   "A 2019 study by [researcher/institution]..." 
   - Named study/researcher  ← ❌ Buddha shouldn't cite modern studies!
```

**Problem**: Buddha is told to cite modern studies instead of referencing dharma, teachings, and parables!

---

## 4. Where in the Prompt Does Persona Identity Appear?

### Prompt Structure (Order of Sections)

1. **Persona Section** (lines 364-415)
   - Appears FIRST in the prompt
   - Contains character identity and behavioral anchors
   - Different structure for GPT-5 vs other models

2. **Debate Context** (lines 502-519)
   - Generic debate instructions
   - Stubbornness/cooperation levels
   - Position assignment

3. **Behavioral Parameters** (lines 513-514)
   - Based on agreeability level

4. **Response Length** (lines 516-517)
   - Based on extensiveness level

5. **Turn-Specific Instructions** (lines 521-612)
   - First turn vs subsequent turns
   - **Evidence guidance appears here** (lines 583-599)

6. **Character Reinforcement** (lines 615-634, GPT-5 only)
   - Final reminder for GPT-5 with personas

### Key Finding
**Persona identity is at the TOP**, but **evidence instructions are at the BOTTOM** in turn-specific instructions. This means:
- Personas get character context first
- But then generic evidence instructions override/ignore character context
- **No connection between persona identity and evidence type**

---

## 5. Do Personas Currently Get Evidence-Type Guidance?

### Answer: **NO - They get GENERIC evidence guidance that conflicts with character**

**Current Evidence Instructions** (lines 583-599):
- Apply to ALL personas equally
- Require "studies", "research", "researchers"
- Don't consider historical period
- Don't consider character's knowledge base

**Problems**:
1. **Historical Anachronism**: Ancient personas (Marcus, Diogenes, Buddha, Socrates) told to cite modern studies
2. **Character Mismatch**: Philosophers told to cite research instead of principles
3. **Generic Instructions**: All personas get same evidence requirements regardless of character

**Example Conflicts**:
- Marcus Aurelius (121-180 CE) → Told to cite "2019 studies"
- Diogenes (404-323 BCE) → Told to cite "researchers"
- Buddha (5th-4th century BCE) → Told to cite modern research
- Socrates (470-399 BCE) → Told to cite studies instead of using Socratic method

---

## 6. Where Can We Inject Persona-Specific Evidence Guidance?

### Recommended Injection Points

**Option A: Replace Evidence Section When Persona Active** (Recommended)
- **Location**: Lines 583-599 (evidence guidance section)
- **Logic**: If `personaId` exists, check for persona-specific evidence guidance
- **Fallback**: Use diverse evidence types if no persona-specific guidance

**Implementation Structure**:
```typescript
// Around line 569-612, in turn-specific instructions
if (turnNumber > 0) {
  // ... existing turn instructions ...
  
  systemPrompt += `
  
3. INTRODUCE NEW EVIDENCE - BE SPECIFIC:
  `;
  
  // NEW: Persona-specific evidence guidance
  if (personaId) {
    const personaEvidenceGuidance = getPersonaEvidenceGuidance(personaId);
    if (personaEvidenceGuidance) {
      systemPrompt += personaEvidenceGuidance;
    } else {
      // Fallback to diverse evidence types (Phase 2)
      systemPrompt += getDiverseEvidenceGuidance();
    }
  } else {
    // No persona: use diverse evidence types (Phase 2)
    systemPrompt += getDiverseEvidenceGuidance();
  }
}
```

**Option B: Inject After Persona Section**
- **Location**: After line 414 (after personaPromptPart)
- **Logic**: Add evidence guidance immediately after character identity
- **Pros**: Evidence guidance appears with character context
- **Cons**: Might be less visible in turn-specific instructions

---

## Summary Table

| Aspect | Current State | Issue |
|--------|--------------|-------|
| **Persona Structure** | Same template, different content | ✅ OK |
| **Identity Content** | Unique per persona | ✅ OK |
| **Turn Rules** | Unique per persona | ✅ OK |
| **Evidence Guidance** | Generic for ALL personas | ❌ **PROBLEM** |
| **Historical Accuracy** | Anachronistic (modern studies for ancient personas) | ❌ **PROBLEM** |
| **Character Authenticity** | Evidence type doesn't match character | ❌ **PROBLEM** |

---

## Recommendations for Phase 3 Implementation

1. **Create Persona Evidence Function**:
   - Map persona IDs to evidence guidance
   - Return null for personas without specific guidance
   - Fallback to diverse evidence types (Phase 2)

2. **Injection Point**:
   - Replace evidence section (lines 583-599) when persona active
   - Use conditional logic: `if (personaId) { personaGuidance } else { diverseGuidance }`

3. **Priority Personas** (Most Impact):
   - Marcus Aurelius → Stoic philosophy, historical examples
   - Diogenes → Thought experiments, paradoxes
   - Buddha → Teachings, parables, dharma
   - Socrates → Socratic method, questioning
   - Nietzsche → Philosophical aphorisms, cultural critique

4. **Fallback Strategy**:
   - If persona has no specific guidance → Use Phase 2 diverse evidence types
   - If no persona → Use Phase 2 diverse evidence types
   - This ensures all debates benefit from evidence diversity

---

## Next Steps

✅ **Phase 1 Complete**: Understanding current persona prompt structure

➡️ **Phase 2**: Implement diverse evidence types (update lines 583-599)

➡️ **Phase 3**: Add persona-specific evidence guidance (conditional injection)

---

## Code References

**Persona Definitions**: `src/lib/personas.ts` (lines 22-203)

**Prompt Generation**: `src/lib/orchestrator.ts`:
- Persona detection: Lines 364-415
- GPT-5 enhanced: Lines 375-407
- Standard personas: Lines 408-414
- Evidence guidance: Lines 583-599
- Character reinforcement: Lines 615-634

