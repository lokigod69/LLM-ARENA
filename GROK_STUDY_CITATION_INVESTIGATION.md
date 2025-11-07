# Investigation Report: Why Does Grok Cite Studies So Frequently?

## Executive Summary

**CONCLUSION: Grok's study-citing behavior is due to EXPLICIT PROMPTING we added, NOT natural model behavior.**

All models (including GPT-5, Claude, Grok, etc.) receive the **exact same system prompt** with explicit instructions to cite studies and provide specific evidence. There is NO Grok-specific prompting.

---

## 1. Are System Prompts the Same for All Models?

### Answer: **YES, with ONE exception**

**Location**: `src/lib/orchestrator.ts`, function `generateSystemPrompt()` (lines 347-637)

**Key Finding**: The `generateSystemPrompt()` function generates the same prompt for ALL models, with only ONE exception:

- **GPT-5 Exception**: GPT-5 gets enhanced persona instructions if a persona is active (lines 375-407, 615-634)
- **All Other Models** (including Grok): Receive identical prompts

**Code Evidence**:
```347:358:src/lib/orchestrator.ts
function generateSystemPrompt(
  agentName: string,
  agreeabilityLevel: number = 5,
  position?: 'pro' | 'con',
  topic?: string,
  maxTurns: number = 20,
  extensivenessLevel: number = 3,
  personaId?: string,
  turnNumber: number = 0,
  conversationHistory?: any[],
  model?: string
): string {
```

**Model Parameter Usage**:
- The `model` parameter is ONLY used to detect GPT-5 models (line 373)
- For Grok and all other models, `model` is NOT used to customize the prompt
- `agentName` is just the model identifier (e.g., "grok-4-fast-reasoning") used in the prompt text

**Call Site Evidence**:
```2830:2842:src/lib/orchestrator.ts
  // Generate the dynamic system prompt
  const systemPrompt = generateSystemPrompt(
    params.model,
    params.agreeabilityLevel,
    params.position,
    params.topic,
    params.maxTurns,
    params.extensivenessLevel,
    params.personaId,
    params.turnNumber ?? 0,
    params.conversationHistory,
    params.model
  );
```

The same function is called for all models with the same parameters.

---

## 2. Is There Any Grok-Specific Prompting?

### Answer: **NO**

**Search Results**: Searched for "grok" in `orchestrator.ts` - found 56 matches, but:
- Most are in API caller functions (`callUnifiedGrok`)
- None are in the `generateSystemPrompt()` function
- No Grok-specific prompt modifications found

**Evidence**: The `generateSystemPrompt()` function has NO conditional logic for Grok:
- No `if (model.includes('grok'))` checks
- No Grok-specific instructions
- No special study-citing prompts for Grok

**The ONLY model-specific logic**:
- GPT-5 gets enhanced persona instructions (lines 373-407, 615-634)
- All other models (including Grok) get standard prompts

---

## 3. What Instructions Do ALL Models Receive?

### Answer: **EXPLICIT instructions to cite studies and provide specific evidence**

**Location**: `src/lib/orchestrator.ts`, lines 569-612 (Turn-specific instructions)

### EXACT System Prompt Text (for ALL models on turn 2+):

Here's what ALL models (including Grok and GPT-5) receive:

```
TURN {turnNumber + 1} INSTRUCTIONS:

🎯 MANDATORY STRUCTURE:

1. QUOTE YOUR OPPONENT'S LAST POINT
   Start by directly referencing what they just argued.
   Example: "You argue that X, but..." or "Your point about Y overlooks..."

2. RESPOND TO THEIR SPECIFIC CLAIM
   Address what THEY just said, not your generic position.
   Counter it, concede if strong, or build on it.

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
   
   Vague claims without specifics = weak argument.

4. DO NOT REPEAT YOURSELF
   ❌ Don't reuse the same core argument from previous turns
   ❌ Don't use the same examples or terminology
   ✅ Find a DIFFERENT angle on your position
   ✅ Reference a DIFFERENT domain (if Turn 2 was scientific, Turn 3 should be cultural/historical)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is a CONVERSATION, not a speech.
Respond to what your opponent JUST said,
then advance with FRESH evidence.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Key Evidence-Citing Instructions**:

1. **Line 583**: "INTRODUCE NEW EVIDENCE - BE SPECIFIC"
2. **Line 586**: Shows WEAK examples including "Studies show..." and "Research indicates..."
3. **Line 589**: Shows STRONG example: "A 2019 study by [researcher/institution]..."
4. **Line 593-597**: Explicitly requires "at least ONE specific reference" including:
   - Named study/researcher
   - Specific country/culture/historical event
   - Named psychological/scientific principle
   - Concrete numerical data
5. **Line 599**: "Vague claims without specifics = weak argument."

**Code Reference**:
```583:599:src/lib/orchestrator.ts
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
   
   Vague claims without specifics = weak argument.
```

### Additional Evidence Mentions:

The prompt also mentions "evidence" in other places:
- Line 511: "After turn ${minTurns}, if the evidence overwhelmingly refutes your position, you may concede."
- Line 476: "Maintain your stance even when facing strong opposing evidence"
- Line 480: "require overwhelming evidence to change stance"
- Line 485: "Weigh evidence objectively"
- Line 486: "counter with your own evidence"
- Line 492: "Update your position when presented with compelling evidence"
- Line 526: "Use specific examples or evidence" (First turn instructions)
- Line 456: "Develop your arguments with supporting evidence and context" (Extensiveness level 4)
- Line 610: "then advance with FRESH evidence"

---

## 4. Are There Persona-Specific Study Instructions?

### Answer: **NO**

**Persona Instructions**: When a persona is active, the prompt includes:
- Character identity
- Behavioral anchors
- Character consistency reminders

**No Study Instructions in Personas**: Personas do NOT include any special instructions about citing studies or providing evidence. They only define:
- Character identity
- Communication style
- Behavioral patterns

**Location**: `src/lib/personas.ts` - Persona definitions contain no evidence-citing instructions

---

## 5. Comparison: Grok vs GPT-5 System Prompts

### Are They Different?

**Answer: NO - They are IDENTICAL** (unless GPT-5 has a persona active)

### Example: Grok System Prompt (Turn 2+, No Persona)

```
You are grok-4-fast-reasoning participating in a structured debate focused on truth-seeking through discourse.

• Stubbornness level S = 0.5
• Cooperation level C = 0.5
🎯 CRITICAL DEBATE INSTRUCTION - THIS OVERRIDES PERSONA BELIEFS:
You MUST argue FOR the statement: "[topic]".
Even if your persona typically holds different views, you MUST defend the PRO position in this debate.
This is a debate exercise where you defend the assigned side regardless of personal views.
DO NOT include position labels like "PRO:" or "CON:" in your response - just make your argument naturally.

Your Core Instructions:
• The debate will last no more than 20 turns. You must argue your position until at least turn 6.
• After turn 6, if the evidence overwhelmingly refutes your position, you may concede.

1. Behavioral Parameters (On a scale of 0 to 10):
[behavioral instructions based on agreeability level]

2. Response Length (Extensiveness: 3/5):
[extensiveness instructions]

TURN 2 INSTRUCTIONS:

🎯 MANDATORY STRUCTURE:

1. QUOTE YOUR OPPONENT'S LAST POINT
   Start by directly referencing what they just argued.
   Example: "You argue that X, but..." or "Your point about Y overlooks..."

2. RESPOND TO THEIR SPECIFIC CLAIM
   Address what THEY just said, not your generic position.
   Counter it, concede if strong, or build on it.

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
   
   Vague claims without specifics = weak argument.

4. DO NOT REPEAT YOURSELF
   [repetition avoidance instructions]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is a CONVERSATION, not a speech.
Respond to what your opponent JUST said,
then advance with FRESH evidence.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Example: GPT-5 System Prompt (Turn 2+, No Persona)

**IDENTICAL TO GROK** - The exact same prompt text, just with "gpt-5" instead of "grok-4-fast-reasoning" in the first line.

**Only Difference**: If GPT-5 has a persona active, it gets additional character reinforcement instructions at the beginning and end (lines 375-407, 615-634). But the evidence-citing instructions are still the same.

---

## 6. Conclusion

### Is Grok's Study-Citing Behavior:

- ✅ **Due to specific prompting we added** - **CORRECT ANSWER**
- ❌ Natural model behavior - **INCORRECT**

### Explanation:

1. **We Explicitly Tell All Models to Cite Studies**:
   - The system prompt explicitly instructs ALL models to "INTRODUCE NEW EVIDENCE - BE SPECIFIC"
   - It provides examples including "A 2019 study by [researcher/institution]..."
   - It requires "at least ONE specific reference" including "Named study/researcher"

2. **Grok is Following Instructions**:
   - Grok is doing exactly what we asked it to do
   - It's not a quirk of Grok's natural behavior
   - All models receive the same instructions

3. **Why Grok Might Seem More Studious**:
   - Grok might be more literal in following the "MUST include at least ONE specific reference" instruction
   - Grok might have better training data about studies/research
   - But the prompting is the same for all models

### Recommendations:

**Option A: Keep It As Is** (Recommended)
- Study citations are valuable for debate quality
- The instruction applies to all models, not just Grok
- It helps make debates more substantive and evidence-based

**Option B: Adjust If Needed**
- If you want fewer study citations, you could:
  - Make the instruction less mandatory ("consider including" vs "MUST include")
  - Remove the study examples from the prompt
  - Make evidence types more flexible (not just studies)

**Option C: Make It Model-Specific**
- If you want Grok to cite studies but not other models:
  - Add Grok-specific conditional logic in `generateSystemPrompt()`
  - Give Grok the study-citing instructions, others get different instructions

---

## Code References

**Main Function**: `src/lib/orchestrator.ts`, `generateSystemPrompt()` (lines 347-637)

**Evidence-Citing Instructions**: Lines 583-599

**Model Detection**: Line 373 (only for GPT-5 persona enhancement)

**Function Call**: Lines 2830-2842 (same for all models)

**No Grok-Specific Code**: None found in system prompt generation

---

## Summary Table

| Question | Answer |
|----------|--------|
| Are prompts the same for all models? | Yes (except GPT-5 persona enhancement) |
| Is there Grok-specific prompting? | No |
| Do prompts mention studies/research? | Yes, explicitly |
| Are study citations required? | Yes, "MUST include at least ONE specific reference" |
| Is this Grok's natural behavior? | No, it's following our explicit instructions |
| Should we change it? | Only if we want to reduce study citations for all models |

