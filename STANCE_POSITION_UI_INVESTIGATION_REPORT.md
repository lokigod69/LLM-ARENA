# 🔍 STANCE/POSITION UI REORGANIZATION - INVESTIGATION REPORT

**Date:** Investigation Report  
**Status:** ✅ Complete - Ready for Implementation Planning

---

## EXECUTIVE SUMMARY

This investigation maps the current implementation of the debate configuration UI, specifically focusing on:
1. **Stance Slider** (1-9 blue/red scale) vs **Pro/Con Position Buttons** (👍/👎)
2. **Persona-Stance Interaction** (how personas disable/lock stance values)
3. **UI Reorganization** requirements
4. **Label Changes** ("Scope" → "Response Depth", "Max Turns" → "Debate Rounds")

**Key Finding:** The Pro/Con position buttons are currently embedded within the STANCE section of `DualPersonalitySlider.tsx`, but they control fundamentally different concepts:
- **Stance Slider**: How strongly/openly they argue their assigned position (0-10 agreeability scale)
- **Pro/Con Buttons**: Which side of the topic each model argues (FOR or AGAINST)

---

## 1. CURRENT STANCE/POSITION IMPLEMENTATION

### 1.1 Main Component Location

**File:** `src/components/DualPersonalitySlider.tsx`  
**Lines:** 270-522 (STANCE section)

**Component Structure:**
```270:522:src/components/DualPersonalitySlider.tsx
      {/* STANCE Control Section */}
      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h3 className="text-2xl font-matrix font-bold text-matrix-green text-center mb-4 tracking-wider">
          STANCE
        </h3>
        
        {/* Model A and B Sliders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model A Slider */}
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div 
              className="bg-gradient-to-br from-matrix-dark to-matrix-darker p-5 rounded-lg border"
              style={{ borderColor: `${getModelColor(modelA.name)}40` }}
            >
              {/* Centered Icon and Level */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <motion.span 
                  className="text-2xl"
                  animate={{ 
                    filter: `drop-shadow(${getPillGlow(modelA.agreeabilityLevel)})`,
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    filter: { duration: 0.3 },
                    scale: { duration: 2, repeat: Infinity }
                  }}
                >
                  {getPillIcon(getEffectiveAgreeability(modelA))}
                </motion.span>
                <div 
                  className="font-matrix text-lg"
                  style={{ color: getModelColor(modelA.name) }}
                >
                  {getEffectiveAgreeability(modelA)}
                </div>
              </div>

              {/* Model A Slider */}
              <div className="relative mb-4">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={modelA.personaId ? (10 - PERSONAS[modelA.personaId].lockedTraits.baseStubbornness) : modelA.agreeabilityLevel}
                  onChange={handleModelAChange}
                  disabled={disabled || !!modelA.personaId}
                  className={`w-full h-2 bg-matrix-darker rounded-lg appearance-none slider-model-a ${
                    disabled || !!modelA.personaId ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                  style={{
                    background: getBackgroundGradient(getEffectiveAgreeability(modelA)),
                  }}
                />
              </div>

              {/* Model A Status */}
              <div>
                {(() => {
                  // Use persona's locked value if persona is selected, otherwise use slider value
                  const effectiveAgreeability = modelA.personaId 
                    ? (10 - PERSONAS[modelA.personaId].lockedTraits.baseStubbornness)
                    : modelA.agreeabilityLevel;
                  
                  return (
                    <>
                      <div className="text-sm font-matrix text-center" style={{ color: getPersonalityTextColor(effectiveAgreeability) }}>
                        {getPersonalityType(effectiveAgreeability)}
                      </div>
                      <div className="text-xs text-center opacity-80" style={{ color: getPersonalityTextColor(effectiveAgreeability) }}>
                        {getPersonalityDescription(effectiveAgreeability)}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Green Divider */}
              <div className="my-4">
                <div className="h-px bg-gradient-to-r from-transparent via-matrix-green to-transparent opacity-50"></div>
              </div>

              {/* Model A Position Assignment */}
              <div className="text-center">
                <div 
                  className="text-xs mb-2 tracking-wider"
                  style={{ color: getModelColor(modelA.name) }}
                >
                  POSITION
                </div>
                <motion.div
                  className="cursor-pointer p-3 rounded-lg"
                  style={{ 
                    backgroundColor: modelA.position === 'pro' 
                      ? 'rgba(34, 197, 94, 0.1)' 
                      : 'rgba(239, 68, 68, 0.1)' 
                  }}
                  onClick={() => handlePositionToggle('A')}
                  whileHover={!disabled ? { scale: 1.1 } : {}}
                  whileTap={!disabled ? { scale: 0.9 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="text-3xl mb-1"
                    key={modelA.position} // Re-animate when position changes
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
                  >
                    {getPositionIcon(modelA.position)}
                  </motion.div>
                  <div 
                    className="text-sm font-matrix tracking-wider"
                    style={{ color: getPositionColor(modelA.position) }}
                  >
                    {modelA.position.toUpperCase()}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Model B Slider */}
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div 
              className="bg-gradient-to-br from-matrix-dark to-matrix-darker p-5 rounded-lg border"
              style={{ borderColor: `${getModelColor(modelB.name)}40` }}
            >
              {/* Centered Icon and Level */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <motion.span 
                  className="text-2xl"
                  animate={{ 
                    filter: `drop-shadow(${getPillGlow(modelB.agreeabilityLevel)})`,
                    scale: [1, 1.1, 1]
                  }}
                  transition={{ 
                    filter: { duration: 0.3 },
                    scale: { duration: 2, repeat: Infinity }
                  }}
                >
                  {getPillIcon(getEffectiveAgreeability(modelB))}
                </motion.span>
                <div 
                  className="font-matrix text-lg"
                  style={{ color: getModelColor(modelB.name) }}
                >
                  {getEffectiveAgreeability(modelB)}
                </div>
              </div>

              {/* Model B Slider */}
              <div className="relative mb-4">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={modelB.personaId ? (10 - PERSONAS[modelB.personaId].lockedTraits.baseStubbornness) : modelB.agreeabilityLevel}
                  onChange={handleModelBChange}
                  disabled={disabled || !!modelB.personaId}
                  className={`w-full h-2 bg-matrix-darker rounded-lg appearance-none slider-model-b ${
                    disabled || !!modelB.personaId ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                  style={{
                    background: getBackgroundGradient(getEffectiveAgreeability(modelB)),
                  }}
                />
              </div>

              {/* Model B Status */}
              <div>
                {(() => {
                  // Use persona's locked value if persona is selected, otherwise use slider value
                  const effectiveAgreeability = modelB.personaId 
                    ? (10 - PERSONAS[modelB.personaId].lockedTraits.baseStubbornness)
                    : modelB.agreeabilityLevel;
                  
                  return (
                    <>
                      <div className="text-sm font-matrix text-center" style={{ color: getPersonalityTextColor(effectiveAgreeability) }}>
                        {getPersonalityType(effectiveAgreeability)}
                      </div>
                      <div className="text-xs text-center opacity-80" style={{ color: getPersonalityTextColor(effectiveAgreeability) }}>
                        {getPersonalityDescription(effectiveAgreeability)}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Divider with Model B color */}
              <div className="my-4">
                <div 
                  className="h-px bg-gradient-to-r from-transparent to-transparent opacity-50"
                  style={{ 
                    background: `linear-gradient(to right, transparent, ${getModelColor(modelB.name)}, transparent)` 
                  }}
                ></div>
              </div>

              {/* Model B Position Assignment */}
              <div className="text-center">
                <div 
                  className="text-xs mb-2 tracking-wider"
                  style={{ color: getModelColor(modelB.name) }}
                >
                  POSITION
                </div>
                <motion.div
                  className="cursor-pointer p-3 rounded-lg"
                  style={{ 
                    backgroundColor: modelB.position === 'pro' 
                      ? 'rgba(34, 197, 94, 0.1)' 
                      : 'rgba(239, 68, 68, 0.1)' 
                  }}
                  onClick={() => handlePositionToggle('B')}
                  whileHover={!disabled ? { scale: 1.1 } : {}}
                  whileTap={!disabled ? { scale: 0.9 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className="text-3xl mb-1"
                    key={modelB.position} // Re-animate when position changes
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
                  >
                    {getPositionIcon(modelB.position)}
                  </motion.div>
                  <div 
                    className="text-sm font-matrix tracking-wider"
                    style={{ color: getPositionColor(modelB.position) }}
                  >
                    {modelB.position.toUpperCase()}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
```

### 1.2 State Management

**Stance Slider State:**
- **Location:** `src/hooks/useDebate.ts`
- **State Variable:** `modelA.agreeabilityLevel` and `modelB.agreeabilityLevel` (0-10 scale)
- **Type:** `ModelConfiguration.agreeabilityLevel: number`
- **Default Value:** Model A = 7, Model B = 3

**Pro/Con Position State:**
- **Location:** `src/hooks/useDebate.ts`
- **State Variable:** `modelA.position` and `modelB.position`
- **Type:** `ModelConfiguration.position: ModelPosition` ('pro' | 'con')
- **Default Value:** Model A = 'pro', Model B = 'con'
- **Validation:** Enforced in `handlePositionToggle` function (lines 201-217)

### 1.3 Position Toggle Logic

**File:** `src/components/DualPersonalitySlider.tsx`  
**Lines:** 200-217

```200:217:src/components/DualPersonalitySlider.tsx
  // Position handling functions
  const handlePositionToggle = useCallback((model: 'A' | 'B') => {
    if (disabled) return;
    
    if (model === 'A') {
      const newPosition = modelA.position === 'pro' ? 'con' : 'pro';
      const otherPosition = newPosition === 'pro' ? 'con' : 'pro';
      
      onModelAChange({ ...modelA, position: newPosition });
      onModelBChange({ ...modelB, position: otherPosition });
    } else {
      const newPosition = modelB.position === 'pro' ? 'con' : 'pro';
      const otherPosition = newPosition === 'pro' ? 'con' : 'pro';
      
      onModelBChange({ ...modelB, position: newPosition });
      onModelAChange({ ...modelA, position: otherPosition });
    }
  }, [modelA, modelB, onModelAChange, onModelBChange, disabled]);
```

**Key Finding:** The position toggle logic **automatically ensures opposite positions**. When Model A's position is toggled, Model B's position is automatically flipped to the opposite. This is a **critical constraint** - both models cannot have the same position.

---

## 2. PERSONA-STANCE INTERACTION

### 2.1 Persona Selection Location

**File:** `src/app/page.tsx`  
**Lines:** 386-443

Persona selectors are rendered in a collapsible section above the `DualPersonalitySlider` component.

### 2.2 Persona-Stance Locking Logic

**File:** `src/hooks/useDebate.ts`  
**Lines:** 1188-1222

```1188:1222:src/hooks/useDebate.ts
  const setModelPersona = useCallback((model: 'A' | 'B', personaId: string | null) => {
    setState(prev => {
      const targetModelKey = model === 'A' ? 'modelA' : 'modelB';
      const currentModelConfig = prev[targetModelKey];

      if (!personaId) {
        // Clear persona AND reset sliders to neutral
        return {
          ...prev,
          [targetModelKey]: {
            ...currentModelConfig,
            personaId: undefined,
            stance: undefined, // Also clear deprecated stance
            agreeabilityLevel: 5,      // ← RESET TO NEUTRAL
            extensivenessLevel: 3       // ← RESET TO NEUTRAL
          }
        };
      }

      const persona = PERSONAS[personaId];
      if (!persona) return prev; // Persona not found, do nothing

      // Set persona AND update slider values to persona's fixed values
      return {
        ...prev,
        [targetModelKey]: {
          ...currentModelConfig,
          personaId,
          stance: undefined, // Ensure deprecated stance is cleared
          agreeabilityLevel: 10 - persona.lockedTraits.baseStubbornness,  // ← UPDATE
          extensivenessLevel: persona.lockedTraits.responseLength          // ← UPDATE
        }
      };
    });
  }, []);
```

**Key Finding:** When a persona is selected:
1. The stance slider value is **automatically set** to `10 - persona.lockedTraits.baseStubbornness`
2. The slider is **disabled** (see line 324: `disabled={disabled || !!modelA.personaId}`)
3. The slider **displays** the persona's locked value (line 322)

### 2.3 Persona Stance Values

**File:** `src/lib/personas.ts`  
**Structure:** Each persona has `lockedTraits.baseStubbornness` (0-10 scale)

**Example Persona Structure:**
```typescript
{
  id: 'marcus_aurelius',
  name: 'Marcus Aurelius',
  lockedTraits: {
    baseStubbornness: 7,  // Higher = more stubborn = lower agreeability
    responseLength: 4
  }
}
```

**Stance Calculation:** `agreeabilityLevel = 10 - baseStubbornness`
- `baseStubbornness: 7` → `agreeabilityLevel: 3` (more stubborn, less agreeable)
- `baseStubbornness: 3` → `agreeabilityLevel: 7` (less stubborn, more agreeable)

### 2.4 Current Disabled State Styling

**File:** `src/components/DualPersonalitySlider.tsx`  
**Lines:** 324-327

```324:327:src/components/DualPersonalitySlider.tsx
                  disabled={disabled || !!modelA.personaId}
                  className={`w-full h-2 bg-matrix-darker rounded-lg appearance-none slider-model-a ${
                    disabled || !!modelA.personaId ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
```

**Current Implementation:**
- **Opacity:** `opacity-50` (50% opacity)
- **Cursor:** `cursor-not-allowed`
- **Visual Indicator:** Only opacity change, no lock icon or explanatory text

**Missing:** No visual indicator explaining WHY the slider is disabled (persona lock).

---

## 3. PRO/CON POSITION LOGIC ANALYSIS

### 3.1 Position Storage

**Type Definition:** `src/types/index.ts`
```typescript
export type ModelPosition = 'pro' | 'con';

export interface ModelConfiguration {
  name: AvailableModel;
  position: ModelPosition;
  agreeabilityLevel: number;
  extensivenessLevel: number;
  personaId?: string;
}
```

### 3.2 Position Validation

**Enforcement:** The `handlePositionToggle` function (lines 201-217) ensures opposite positions:
- When Model A toggles to 'pro', Model B automatically becomes 'con'
- When Model A toggles to 'con', Model B automatically becomes 'pro'
- Same logic applies when Model B toggles

**Critical Constraint:** The system **cannot** have both models on the same side. This is enforced at the UI level, not just backend validation.

### 3.3 Backend Usage

**File:** `src/lib/orchestrator.ts`  
**Function:** `processDebateTurn`  
**Parameter:** `position?: 'pro' | 'con'`

The position is passed to the system prompt generator and used to instruct the model which side of the debate to argue.

### 3.4 Current UI Location

**File:** `src/components/DualPersonalitySlider.tsx`  
**Lines:** 360-396 (Model A), 482-518 (Model B)

The Pro/Con buttons are currently **embedded within the STANCE section**, below the stance slider, separated by a divider. They appear as:
- A clickable div with emoji (👍 for pro, 👎 for con)
- Position label (PRO/CON) in colored text
- Background color indicating position (green tint for pro, red tint for con)

---

## 4. UI COMPONENT STRUCTURE ANALYSIS

### 4.1 Component Hierarchy

```
src/app/page.tsx
  └── PersonaSelector (collapsible section)
  └── DualPersonalitySlider
      ├── STANCE Section
      │   ├── Model A Card
      │   │   ├── Stance Slider (0-10)
      │   │   ├── Personality Type Display
      │   │   └── Position Button (👍/👎) ← Currently here
      │   └── Model B Card
      │       ├── Stance Slider (0-10)
      │       ├── Personality Type Display
      │       └── Position Button (👍/👎) ← Currently here
      └── SCOPE Section
          ├── Model A Extensiveness Slider (1-5)
          └── Model B Extensiveness Slider (1-5)
```

### 4.2 Styling System

**Framework:** Tailwind CSS + Framer Motion  
**Theme:** Matrix cyberpunk (green/black/neon)  
**Component Pattern:** Motion.div with Matrix-themed classes

**Key Classes:**
- `matrix-panel`: Panel background styling
- `matrix-green`: Primary accent color (#00FF41)
- `matrix-dark`, `matrix-darker`, `matrix-black`: Background shades
- `font-matrix`: Custom font family

### 4.3 Disabled State Patterns

**Current Pattern:** `opacity-50 cursor-not-allowed`  
**Used In:**
- Stance slider when persona selected
- Stance slider when debate active
- Extensiveness slider when debate active

**No Existing Tooltip System:** The codebase doesn't appear to have a reusable Tooltip component. Would need to create one or use a simple overlay.

---

## 5. PROPOSED CHANGES - IMPACT ASSESSMENT

### Change A: Move Pro/Con Buttons Under Personas

**Current Location:** Inside `DualPersonalitySlider.tsx` STANCE section (lines 360-396, 482-518)

**Proposed Location:** Near persona selectors in `src/app/page.tsx` (around lines 386-443)

**Impact Assessment:**

1. **Component Restructuring:**
   - **Low Impact:** Pro/Con buttons are self-contained (handlePositionToggle function)
   - **Action Required:** Extract position buttons into separate component OR move inline to page.tsx
   - **State Management:** No changes needed (uses existing `modelA.position` and `modelB.position`)

2. **Layout Changes:**
   - **Medium Impact:** Need to add new section in page.tsx between PersonaSelector and DualPersonalitySlider
   - **CSS:** Minimal - can reuse existing grid/flex patterns
   - **Responsive:** Should maintain mobile-friendly layout

3. **Visual Hierarchy:**
   - **Benefit:** Positions logically grouped with personas (both determine "who argues what")
   - **Benefit:** Stance slider section becomes cleaner (only about "how strongly")

**Recommendation:** ✅ **SAFE TO IMPLEMENT** - Low risk, clear separation of concerns

---

### Change B: Visual Redesign of Disabled Stance Slider

**Current State:**
- Opacity: 50%
- Cursor: not-allowed
- No explanatory text

**Proposed State:**
- Greyed out appearance
- Low opacity (30-40%)
- Overlay text: "🔒 Locked to persona stance"
- Tooltip on hover explaining persona's locked value

**Impact Assessment:**

1. **CSS Changes:**
   - **Low Impact:** Add overlay div with absolute positioning
   - **New Classes:** `persona-locked-overlay`, `persona-locked-text`
   - **Conditional Rendering:** Only show when `modelA.personaId` or `modelB.personaId` exists

2. **Component Changes:**
   - **File:** `src/components/DualPersonalitySlider.tsx`
   - **Lines:** 316-332 (Model A slider), 434-449 (Model B slider)
   - **Action:** Wrap slider input in relative container, add overlay div

3. **Accessibility:**
   - **ARIA:** Add `aria-label` explaining disabled state
   - **Screen Reader:** "Stance slider locked to persona: [persona name]"

**Recommendation:** ✅ **SAFE TO IMPLEMENT** - Pure UI enhancement, no logic changes

---

### Change C: Rename "Scope" to "Response Depth"

**Current Label:** "SCOPE"  
**File:** `src/components/DualPersonalitySlider.tsx`  
**Line:** 532

**Impact Assessment:**

1. **UI Labels:**
   - **File:** `src/components/DualPersonalitySlider.tsx`
   - **Line 532:** Change `<h3>SCOPE</h3>` to `<h3>RESPONSE DEPTH</h3>`
   - **Impact:** Low - single text change

2. **Backend/API:**
   - **Search Results:** No API endpoints use "scope" as a parameter
   - **State:** Uses `extensivenessLevel`, not "scope"
   - **Impact:** None - purely UI label

3. **Documentation/Comments:**
   - **Files to Check:** Any markdown/docs mentioning "scope"
   - **Action:** Find/replace in documentation files

**Recommendation:** ✅ **SAFE TO IMPLEMENT** - Simple find/replace, verify no API contracts

---

### Change D: "Max Turns" → "Debate Rounds" with Logic Fix

**Current Implementation:**

**File:** `src/components/ControlPanel.tsx`  
**Line 66:** `Max Turns: <span>{maxTurns}</span>`

**Turn Counting Logic:**

**File:** `src/hooks/useDebate.ts`  
**Line 981:** `const newTurn = prev.currentTurn + 1;`  
**Line 810:** `if (currentState.currentTurn >= currentState.maxTurns)`

**Current Behavior:**
- `currentTurn` starts at 0
- Increments by 1 each time a model speaks
- `maxTurns: 2` means: Stop after 2 total turns (1 from Model A + 1 from Model B = 2 exchanges)

**Semantic Confusion:**
- "Max Turns: 2" could mean:
  - **Option A:** 2 total turns (1 each) = 1 round
  - **Option B:** 2 rounds (each model speaks twice) = 4 total turns

**Investigation Result:**
- Current logic: `maxTurns: 2` = 2 total turns = 1 round (each model speaks once)
- If user wants "Debate Rounds: 2" to mean "2 rounds" (each model speaks twice), logic needs change

**Impact Assessment:**

1. **Label Change Only (No Logic Change):**
   - **File:** `src/components/ControlPanel.tsx`
   - **Line 66:** Change "Max Turns" to "Debate Rounds"
   - **Clarification:** Add helper text: "Each round = both models speak once"
   - **Impact:** Low - UI only

2. **Logic Change (If Required):**
   - **Current:** `maxTurns: 2` = 2 total turns
   - **Proposed:** `debateRounds: 2` = 4 total turns (2 rounds × 2 models)
   - **Formula:** `maxTurns = debateRounds * 2`
   - **Impact:** **HIGH** - Requires changes to:
     - `useDebate.ts` (state management)
     - `ControlPanel.tsx` (slider max value: 1-10 rounds = 2-20 turns)
     - `orchestrator.ts` (system prompt generation)
     - Backend API routes (if they use maxTurns)
     - Database schema (if maxTurns is stored)

**Recommendation:** 
- ✅ **SAFE:** Label change only ("Max Turns" → "Debate Rounds" with clarification text)
- ⚠️ **RISKY:** Logic change (requires extensive testing, may break existing debates)

**Suggested Approach:** Start with label change + clarification text. If user confirms they want logic change, implement in separate phase.

---

## 6. POTENTIAL ISSUES TO FLAG

### 6.1 State Management Dependencies

**Risk:** Moving Pro/Con buttons could break state flow  
**Mitigation:** Buttons already use `onModelAChange`/`onModelBChange` callbacks - no direct state access  
**Status:** ✅ **LOW RISK**

### 6.2 CSS Layout Assumptions

**Risk:** Current CSS assumes Pro/Con buttons are inside stance cards  
**Mitigation:** Buttons are self-contained divs - easy to move  
**Status:** ✅ **LOW RISK**

### 6.3 Automated Tests

**Risk:** Tests might reference UI elements by structure  
**Action:** Check for test files (none found in codebase search)  
**Status:** ✅ **NO TESTS FOUND**

### 6.4 Accessibility Concerns

**Current State:**
- No ARIA labels on disabled sliders
- No screen reader text explaining persona lock
- Position buttons have emoji but no alt text

**Recommendations:**
- Add `aria-label` to disabled sliders: "Stance slider locked to persona: [name]"
- Add `aria-label` to position buttons: "Toggle Model A position (currently [pro/con])"
- Ensure keyboard navigation works for position buttons

**Status:** ⚠️ **SHOULD ADDRESS** - Good opportunity to improve accessibility

### 6.5 Mobile Responsive Considerations

**Current Layout:**
- `grid grid-cols-1 lg:grid-cols-2` - Responsive grid
- Pro/Con buttons are inside cards that stack on mobile

**Moving Buttons:**
- Need to ensure new location maintains responsive behavior
- Consider: Should Pro/Con buttons be side-by-side or stacked on mobile?

**Status:** ✅ **LOW RISK** - Standard responsive patterns apply

---

## 7. FILE INVENTORY

### Files Requiring Modification:

#### Change A: Move Pro/Con Buttons
1. **`src/components/DualPersonalitySlider.tsx`**
   - Remove: Lines 360-396 (Model A position), 482-518 (Model B position)
   - Remove: `handlePositionToggle` function (lines 200-217) OR keep if used elsewhere
   - Remove: `getPositionIcon` and `getPositionColor` helpers (lines 219-226) OR keep if used elsewhere

2. **`src/app/page.tsx`**
   - Add: New section between PersonaSelector and DualPersonalitySlider
   - Add: Pro/Con position buttons (extracted from DualPersonalitySlider)
   - Add: Import `handlePositionToggle` logic or inline it

#### Change B: Disabled Stance Slider Redesign
1. **`src/components/DualPersonalitySlider.tsx`**
   - Modify: Lines 316-332 (Model A slider container)
   - Modify: Lines 434-449 (Model B slider container)
   - Add: Overlay div with lock icon and text
   - Add: CSS classes for disabled overlay

#### Change C: Rename "Scope" to "Response Depth"
1. **`src/components/DualPersonalitySlider.tsx`**
   - Modify: Line 532 (`<h3>SCOPE</h3>` → `<h3>RESPONSE DEPTH</h3>`)

2. **Documentation Files (if any):**
   - Search for "scope" in markdown files
   - Update if found

#### Change D: "Max Turns" → "Debate Rounds"
1. **`src/components/ControlPanel.tsx`**
   - Modify: Line 66 (label text)
   - Add: Helper text explaining rounds vs turns

2. **If Logic Change Required:**
   - **`src/hooks/useDebate.ts`** - State management
   - **`src/lib/orchestrator.ts`** - System prompt generation
   - **`src/app/api/debate/step/route.ts`** - API endpoint
   - **`src/app/api/debates/save/route.ts`** - Database save
   - **`src/app/library/page.tsx`** - Library display

### Files Requiring Review (No Changes):

1. **`src/types/index.ts`** - Type definitions (verify no "scope" references)
2. **`src/lib/personas.ts`** - Persona definitions (verify stance calculation)
3. **`src/components/PersonaSelector.tsx`** - Persona UI (verify integration)

---

## 8. RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Low-Risk UI Changes (Independent)
1. ✅ **Change C:** Rename "Scope" to "Response Depth" (5 min)
2. ✅ **Change B:** Disabled stance slider redesign (30 min)
3. ✅ **Change D (Label Only):** "Max Turns" → "Debate Rounds" + clarification text (10 min)

**Rationale:** These are pure UI changes with no logic dependencies. Can be done in any order.

### Phase 2: Component Restructuring (Moderate Risk)
4. ✅ **Change A:** Move Pro/Con buttons under personas (1-2 hours)

**Rationale:** Requires careful extraction of position toggle logic and ensuring state flow remains intact. Should be tested thoroughly.

### Phase 3: Logic Changes (If Required - High Risk)
5. ⚠️ **Change D (Logic):** Implement rounds-based turn counting (4-6 hours)

**Rationale:** This is a significant logic change affecting multiple systems. Requires:
- State management updates
- API contract verification
- Database migration (if maxTurns is stored)
- Extensive testing
- User communication (breaking change)

**Recommendation:** Defer until user confirms requirement.

---

## 9. ALTERNATIVE SUGGESTIONS

### Alternative 1: Keep Pro/Con Buttons in STANCE Section
**Rationale:** They're conceptually related (both affect how the model argues)  
**Trade-off:** Less clear separation, but maintains current working state

### Alternative 2: Create Separate "POSITION" Section
**Rationale:** Give positions their own dedicated section between Personas and Stance  
**Trade-off:** More sections = more scrolling, but clearer hierarchy

### Alternative 3: Tooltip Instead of Overlay
**Rationale:** Less intrusive than overlay text  
**Trade-off:** Requires hover to see explanation, but cleaner UI

---

## 10. SUMMARY & NEXT STEPS

### Key Findings:
1. ✅ Pro/Con buttons are currently embedded in STANCE section
2. ✅ Position toggle logic ensures opposite positions (critical constraint)
3. ✅ Persona selection disables stance slider with minimal visual feedback
4. ✅ "Scope" label is purely UI (no backend impact)
5. ✅ "Max Turns" logic counts total turns, not rounds

### Recommended Actions:
1. **Immediate:** Implement Phase 1 changes (low-risk UI improvements)
2. **Next:** Implement Phase 2 (move Pro/Con buttons)
3. **Defer:** Phase 3 (logic changes) until user confirms requirement

### Questions for User:
1. Should "Debate Rounds: 2" mean 2 rounds (4 total turns) or keep current logic (2 total turns)?
2. Prefer overlay text or tooltip for disabled stance slider?
3. Should Pro/Con buttons be in separate section or grouped with personas?

---

**Investigation Complete** ✅  
**Ready for Implementation Planning** ✅

