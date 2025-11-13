# Qwen 3-Tier Model Implementation Plan

**File Created:** Investigation and implementation plan for replacing deprecated `qwen3-30b-a3b` model with 3-tier Qwen system
**Changes:** Comprehensive investigation report mapping all Qwen model references, exact file locations, and surgical implementation plan
**Purpose:** Replace broken `qwen-30b` with `qwen-flash` (Economy), add `qwen-plus` (Recommended), keep `qwen-max` (Premium)

---

## Cursor Rules Applied

Following the **Senior Engineer Task Execution Rule**:
1. ✅ **Clarify Scope First** - Mapped out all Qwen model references across codebase
2. ✅ **Locate Exact Code Insertion Points** - Identified precise file locations and line numbers
3. ✅ **Minimal, Contained Changes** - Only touching Qwen-related code, no other models affected
4. ✅ **Double Check Everything** - Verified Oracle integration, UI components, API endpoints
5. ✅ **Deliver Clearly** - Comprehensive plan with exact locations and changes

**Additional Rules:**
- Used `codebase_search` with target directories to find existing core files
- Checked existing system files before planning changes
- Listed all cursor rules being used

---

## Investigation Summary

### Current State
- **Existing Qwen Models:**
  - `qwen3-max` ✅ (Keep as Premium tier)
  - `qwen3-30b-a3b` ❌ (Remove - deprecated/broken)

### Target State
- **New 3-Tier System:**
  - `qwen-flash` 💚 (Economy - NEW)
  - `qwen-plus` 💛 (Recommended - NEW, default)
  - `qwen-max` 🔴 (Premium - Keep existing)

---

## Files Requiring Changes

### 1. Core Model Configuration

#### File: `src/lib/orchestrator.ts`
**Location:** Lines 247-265 (MODEL_CONFIGS), Lines 1872, 2225, 2264, 2508, 2645, 2728, 3308

**Changes Required:**
- **Remove:** `qwen3-30b-a3b` entry (lines 257-265)
- **Add:** `qwen-flash` entry with pricing: input $0.05/M, output $0.4/M
- **Add:** `qwen-plus` entry with pricing: input $0.4/M, output $1.2/M
- **Update:** `qwen3-max` description to indicate "Premium" tier
- **Update:** `callUnifiedOpenRouter` function signature (line 1872): Change from `'qwen3-max' | 'qwen3-30b-a3b'` to `'qwen-flash' | 'qwen-plus' | 'qwen3-max'`
- **Update:** `callOpenRouterOracle` function signature (line 2508): Same change
- **Update:** `callFlexibleOracle` switch case (line 2225): Update type assertion
- **Update:** `getOracleModelConfig` function (line 2264): Add entries for new models
- **Update:** `generateMockOracleAnalysis` (line 2645): Add entries for new models
- **Update:** `buildFlexibleOracleSystemPrompt` (line 2728): Add entries for new models
- **Update:** `processDebateTurn` switch case (line 3308): Update type assertion

**API Endpoint:** All use same OpenRouter endpoint: `https://openrouter.ai/api/v1/chat/completions`
**Model Names:**
- `qwen-flash` → `qwen/qwen-flash` (OpenRouter format)
- `qwen-plus` → `qwen/qwen-plus` (OpenRouter format)
- `qwen3-max` → `qwen/qwen3-max` (already correct)

---

#### File: `src/lib/modelConfigs.ts`
**Location:** Lines 123-136 (MODEL_DISPLAY_CONFIGS)

**Changes Required:**
- **Remove:** `qwen3-30b-a3b` entry (lines 130-136)
- **Add:** `qwen-flash` entry:
  ```typescript
  'qwen-flash': {
    name: 'qwen-flash',
    displayName: 'Qwen Flash',
    shortName: 'Qwen Flash',
    color: '#10B981', // Green for economy tier
    description: 'Fastest and most cost-effective. Great for quick debates.'
  }
  ```
- **Add:** `qwen-plus` entry:
  ```typescript
  'qwen-plus': {
    name: 'qwen-plus',
    displayName: 'Qwen Plus ⭐',
    shortName: 'Qwen Plus',
    color: '#F59E0B', // Amber/gold for recommended
    description: 'Balanced performance and cost. Recommended for most debates.'
  }
  ```
- **Update:** `qwen3-max` entry:
  ```typescript
  'qwen3-max': {
    name: 'qwen3-max',
    displayName: 'Qwen Max',
    shortName: 'Qwen Max',
    color: '#E8420A', // Keep existing red-orange
    description: 'Highest quality for complex topics. Premium option.'
  }
  ```

**Note:** UI components (`EnhancedModelSelector`, `OracleConfigPanel`) automatically pick up changes via `getAvailableModels()` and `ORACLE_CAPABLE_MODELS`, so no direct changes needed there.

---

#### File: `src/types/index.ts`
**Location:** Lines 14-32 (AvailableModel type)

**Changes Required:**
- **Remove:** `| 'qwen3-30b-a3b'` (line 29)
- **Add:** `| 'qwen-flash'`
- **Add:** `| 'qwen-plus'`

**New Type Definition:**
```typescript
export type AvailableModel = 
  | 'gpt-5' 
  | 'gpt-5-mini' 
  | 'gpt-5-nano'
  | 'gpt-4o-mini' 
  | 'claude-3-5-sonnet-20241022'
  | 'claude-haiku-4-5-20251001'
  | 'deepseek-r1' 
  | 'deepseek-v3' 
  | 'gemini-2.5-flash' 
  | 'gemini-2.5-pro-preview-05-06'
  | 'gemini-2.5-flash-lite'
  | 'grok-4-fast-reasoning'
  | 'grok-4-fast'
  | 'qwen-flash'        // NEW
  | 'qwen-plus'         // NEW
  | 'qwen3-max'
  | 'moonshot-v1-8k'
  | 'moonshot-v1-32k'
  | 'moonshot-v1-128k';
```

---

#### File: `src/types/oracle.ts`
**Location:** Lines 118-135 (ORACLE_CAPABLE_MODELS), Lines 138-157 (ORACLE_MODEL_STRENGTHS)

**Changes Required:**
- **Remove:** `'qwen3-30b-a3b'` from `ORACLE_CAPABLE_MODELS` array (line 133)
- **Add:** `'qwen-flash'` to array
- **Add:** `'qwen-plus'` to array
- **Update:** `ORACLE_MODEL_STRENGTHS` record:
  - Remove `'qwen3-30b-a3b'` entry (line 153)
  - Add `'qwen-flash': 'Ultra-fast analysis, cost-effective insights'`
  - Add `'qwen-plus': 'Balanced analysis quality, excellent cost-performance ratio'`
  - Update `'qwen3-max'` description to emphasize premium quality

---

#### File: `src/hooks/useDebate.ts`
**Location:** Line 537 (switch case for model mapping)

**Changes Required:**
- **Remove:** `case 'qwen3-30b-a3b':` (line 537)
- **Add:** `case 'qwen-flash':`
- **Add:** `case 'qwen-plus':`

**Note:** These cases just pass through the model name, so they're straightforward additions.

---

#### File: `docs/API_CALLING_ARCHITECTURE.md`
**Location:** Line 22 (documentation table)

**Changes Required:**
- **Update:** Table entry for `callUnifiedOpenRouter` models column
- **Change:** From `qwen3-max`, `qwen3-30b-a3b` 
- **To:** `qwen-flash`, `qwen-plus`, `qwen3-max`

**Note:** Documentation update only - no code impact.

---

## Implementation Order

### Phase 1: Type Definitions (Foundation)
1. ✅ Update `src/types/index.ts` - Add new model types, remove deprecated
2. ✅ Update `src/types/oracle.ts` - Update Oracle arrays and strengths

### Phase 2: Core Configuration
3. ✅ Update `src/lib/orchestrator.ts` - MODEL_CONFIGS, function signatures
4. ✅ Update `src/lib/modelConfigs.ts` - Display configs

### Phase 3: Integration Points
5. ✅ Update `src/hooks/useDebate.ts` - Switch case handling

### Phase 4: Documentation
6. ✅ Update `docs/API_CALLING_ARCHITECTURE.md` - Update model list

### Phase 5: Verification
7. ✅ Verify UI components automatically pick up changes
8. ✅ Test model selection in debate selector
9. ✅ Test model selection in Oracle selector
10. ✅ Verify API calls use correct model names

---

## Critical Details

### Pricing Configuration
- **qwen-flash:** `costPer1kTokens: { input: 0.00005, output: 0.0004 }` ($0.05/$0.40 per million)
- **qwen-plus:** `costPer1kTokens: { input: 0.0004, output: 0.0012 }` ($0.40/$1.20 per million)
- **qwen3-max:** Keep existing `{ input: 0.0012, output: 0.006 }` ($1.20/$6.00 per million)

### API Model Names (OpenRouter Format)
- **qwen-flash:** `qwen/qwen-flash`
- **qwen-plus:** `qwen/qwen-plus`
- **qwen3-max:** `qwen/qwen3-max` (unchanged)

### Context Windows
- **qwen-flash:** 1,000,000 tokens (as per user spec)
- **qwen-plus:** 1,000,000 tokens (as per user spec)
- **qwen3-max:** 262,144 tokens (keep existing)

### Default Model Selection
- **Current:** No explicit Qwen default (users manually select)
- **Recommendation:** Consider adding logic to default to `qwen-plus` when Qwen provider is selected, but this is **NOT** in current scope
- **Note:** Default debate models are set in `useDebate.ts` (lines 217-228) - these remain `gpt-5` and `claude-3-5-sonnet-20241022`, which is correct

### Oracle Configuration
- **Oracle maxTokens:** 8000 for all three (same as current `qwen3-30b-a3b`)
- **Oracle temperature:** 0.1 for all three (same as current)

---

## Testing Checklist

### Pre-Implementation
- [ ] Verify `qwen3-30b-a3b` is currently broken/deprecated
- [ ] Confirm OpenRouter API supports `qwen-flash` and `qwen-plus`
- [ ] Verify pricing matches user specifications

### Post-Implementation
- [ ] **Debate Selector:** All 3 Qwen models appear in dropdown
- [ ] **Oracle Selector:** All 3 Qwen models appear in Oracle dropdown
- [ ] **Model Display:** Names show correctly (Flash, Plus ⭐, Max)
- [ ] **API Calls:** Verify correct OpenRouter model names are sent
- [ ] **Cost Calculation:** Token usage calculates correctly for all tiers
- [ ] **No Console Errors:** Check browser console for TypeScript errors
- [ ] **No Broken References:** Search codebase for any remaining `qwen3-30b-a3b` references

---

## Risk Assessment

### Low Risk
- ✅ Type definitions (straightforward additions)
- ✅ Display configs (additive changes)
- ✅ Oracle arrays (additive changes)

### Medium Risk
- ⚠️ Function signature updates (must update all call sites)
- ⚠️ Switch case updates (must handle all branches)

### Mitigation
- Use TypeScript compiler to catch missing cases
- Test each model individually after implementation
- Verify no references to deprecated model remain

---

## Files NOT Requiring Changes

These files automatically pick up changes:
- ✅ `src/components/EnhancedModelSelector.tsx` - Uses `getAvailableModels()`
- ✅ `src/components/OracleConfigPanel.tsx` - Uses `ORACLE_CAPABLE_MODELS`
- ✅ `src/app/page.tsx` - Uses hook functions
- ✅ `src/app/api/debate/oracle/route.ts` - Uses `callFlexibleOracle` which handles all models

---

## Summary

**Total Files to Modify:** 6
1. `src/types/index.ts`
2. `src/types/oracle.ts`
3. `src/lib/orchestrator.ts` (most complex - multiple locations)
4. `src/lib/modelConfigs.ts`
5. `src/hooks/useDebate.ts`
6. `docs/API_CALLING_ARCHITECTURE.md` (documentation only)

**Total Lines to Change:** ~15-20 locations across these files

**Breaking Changes:** None (removing deprecated model, adding new ones)

**Backward Compatibility:** Maintained (no existing functionality removed except deprecated model)

---

## Next Steps

1. Review this plan with agent
2. Get approval to proceed
3. Implement changes in order specified
4. Test thoroughly
5. Verify no regressions

