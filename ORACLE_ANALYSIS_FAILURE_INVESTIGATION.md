# 🔍 ORACLE ANALYSIS FAILURE INVESTIGATION REPORT

**Date:** Investigation Report  
**Status:** ✅ Root Cause Identified - Ready for Fix

---

## EXECUTIVE SUMMARY

**Root Cause:** **Scenario C - Messages parsed but not used in prompt**

The Oracle API route is receiving flexible model data (`modelAMessages`, `modelBMessages`, `modelAName`, `modelBName`) from the frontend, but **completely ignoring it** and only using legacy `gptMessages`/`claudeMessages` fields which are empty or stale. The prompt builder hardcodes "GPT-4 RESPONSES" and "CLAUDE RESPONSES" labels, causing Oracle to analyze empty message arrays and fall back to topic-only analysis.

---

## 1. DATA FLOW MAP

### Complete Path: Oracle Button Click → API → Prompt → Model Response

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND: useDebate.ts (requestOracleAnalysis)              │
│ Lines 1332-1349                                             │
│                                                             │
│ Sends:                                                      │
│ ✅ modelAMessages: [actual debate messages]                 │
│ ✅ modelBMessages: [actual debate messages]                 │
│ ✅ modelAName: "gpt-5-mini"                                 │
│ ✅ modelBName: "moonshot-v1-128k"                           │
│ ✅ modelAPersonality: { personaId: "dostoyevsky", ... }    │
│ ✅ modelBPersonality: { personaId: "ayn_rand", ... }       │
│ ⚠️ gptMessages: [] (empty legacy field)                    │
│ ⚠️ claudeMessages: [] (empty legacy field)                 │
└─────────────────────────────────────────────────────────────┘
                          ↓ POST /api/debate/oracle
┌─────────────────────────────────────────────────────────────┐
│ API ROUTE: src/app/api/debate/oracle/route.ts              │
│ Line 293                                                    │
│                                                             │
│ ❌ ONLY EXTRACTS:                                           │
│   const { topic, gptMessages, claudeMessages, ... } = body │
│                                                             │
│ ❌ IGNORES:                                                 │
│   - modelAMessages                                          │
│   - modelBMessages                                          │
│   - modelAName                                              │
│   - modelBName                                              │
│   - modelAPersonality                                       │
│   - modelBPersonality                                       │
└─────────────────────────────────────────────────────────────┘
                          ↓ buildOraclePrompt()
┌─────────────────────────────────────────────────────────────┐
│ PROMPT BUILDER: route.ts lines 246-286 & 653-705           │
│                                                             │
│ ❌ HARDCODED LABELS:                                        │
│   prompt += "GPT-4 RESPONSES:\n";                           │
│   request.gptMessages.forEach(...)                          │
│                                                             │
│   prompt += "CLAUDE RESPONSES:\n";                          │
│   request.claudeMessages.forEach(...)                       │
│                                                             │
│ ❌ RESULT:                                                  │
│   - Empty message arrays (gptMessages/claudeMessages = []) │
│   - Oracle sees only topic, no actual debate content        │
│   - Falls back to analyzing topic only                      │
└─────────────────────────────────────────────────────────────┘
                          ↓ Oracle Model (Qwen Plus)
┌─────────────────────────────────────────────────────────────┐
│ ORACLE ANALYSIS OUTPUT                                      │
│                                                             │
│ ❌ References "GPT-4" (not in debate)                       │
│ ❌ Says "Claude's response is absent"                       │
│ ❌ Only analyzes Dostoyevsky's opening (from topic)        │
│ ❌ Ignores actual debate exchange                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. CURRENT STATE vs EXPECTED STATE

### Current State (What's Actually Happening)

**Frontend sends:**
```typescript
{
  topic: "Should AI have rights?",
  modelAMessages: [
    { text: "As Dostoyevsky, I believe...", sender: "GPT-5 Mini", personaId: "dostoyevsky" },
    { text: "Further, the existential...", sender: "GPT-5 Mini", personaId: "dostoyevsky" }
  ],
  modelBMessages: [
    { text: "As Ayn Rand, I argue...", sender: "Kimi 128K", personaId: "ayn_rand" },
    { text: "Objectivism demands...", sender: "Kimi 128K", personaId: "ayn_rand" }
  ],
  modelAName: "gpt-5-mini",
  modelBName: "moonshot-v1-128k",
  modelAPersonality: { personaId: "dostoyevsky", ... },
  modelBPersonality: { personaId: "ayn_rand", ... },
  gptMessages: [], // Empty legacy field
  claudeMessages: [] // Empty legacy field
}
```

**API extracts:**
```typescript
// Line 293: route.ts
const { topic, gptMessages, claudeMessages, ... } = body;
// ❌ Ignores modelAMessages, modelBMessages, modelAName, modelBName
```

**Prompt builder uses:**
```typescript
// Lines 265-275: route.ts
prompt += "GPT-4 RESPONSES:\n";
request.gptMessages.forEach(...) // ❌ Empty array, no messages

prompt += "CLAUDE RESPONSES:\n";
request.claudeMessages.forEach(...) // ❌ Empty array, no messages
```

**Result:** Oracle receives prompt with only topic, no debate messages.

---

### Expected State (What Should Happen)

**API should extract:**
```typescript
const { 
  topic, 
  modelAMessages,      // ✅ Extract flexible data
  modelBMessages,      // ✅ Extract flexible data
  modelAName,          // ✅ Extract model names
  modelBName,          // ✅ Extract model names
  modelAPersonality,   // ✅ Extract persona info
  modelBPersonality,   // ✅ Extract persona info
  totalTurns, 
  config 
} = body;
```

**Prompt builder should use:**
```typescript
// Get display names and persona names
const modelADisplayName = getModelDisplayName(modelAName);
const modelBDisplayName = getModelDisplayName(modelBName);
const personaAName = modelAPersonality?.personaId 
  ? PERSONAS[modelAPersonality.personaId].name 
  : modelADisplayName;
const personaBName = modelBPersonality?.personaId 
  ? PERSONAS[modelBPersonality.personaId].name 
  : modelBDisplayName;

prompt += `${personaAName} (${modelADisplayName}) RESPONSES:\n`;
modelAMessages.forEach((msg, index) => {
  prompt += `Turn ${index + 1}: ${msg.text}\n\n`;
});

prompt += `${personaBName} (${modelBDisplayName}) RESPONSES:\n`;
modelBMessages.forEach((msg, index) => {
  prompt += `Turn ${index + 1}: ${msg.text}\n\n`;
});
```

**Result:** Oracle receives prompt with actual debate messages, correct model names, and persona information.

---

## 3. GAP ANALYSIS

### Where Data is Being Lost

| Stage | Data Available | Data Used | Gap |
|-------|---------------|-----------|-----|
| **Frontend Send** | ✅ modelAMessages, modelBMessages, modelAName, modelBName, personas | ✅ All sent | None |
| **API Extract** | ✅ All in request body | ❌ Only extracts gptMessages/claudeMessages | **GAP 1: Missing extraction** |
| **Prompt Build** | ⚠️ Only has empty gptMessages/claudeMessages | ❌ Uses empty arrays | **GAP 2: Wrong data used** |
| **Oracle Receives** | ❌ Only topic, no messages | ❌ Analyzes topic only | **GAP 3: No debate content** |

### Root Cause Chain

1. **Type Definition Mismatch** (`src/types/oracle.ts` lines 72-80):
   - `OracleAnalysisRequest` interface doesn't include flexible model fields
   - Only defines legacy `gptMessages`, `claudeMessages`

2. **API Route Extraction** (`src/app/api/debate/oracle/route.ts` line 293):
   - Only destructures legacy fields
   - Ignores flexible model data in request body

3. **Prompt Builder Hardcoding** (`src/app/api/debate/oracle/route.ts` lines 265-275, 678-687):
   - Hardcodes "GPT-4 RESPONSES" and "CLAUDE RESPONSES" labels
   - Uses `request.gptMessages` and `request.claudeMessages` (empty arrays)
   - Two functions: `buildOraclePrompt()` and `buildEnhancedOraclePrompt()` both have same issue

---

## 4. CODE EVIDENCE

### Evidence 1: Frontend Sends Flexible Data

**File:** `src/hooks/useDebate.ts`  
**Lines:** 1332-1349

```typescript
const requestData = {
  topic: state.topic,
  // PHASE B: Use flexible model messages
  modelAMessages: state.modelAMessages,        // ✅ Actual debate messages
  modelBMessages: state.modelBMessages,        // ✅ Actual debate messages
  modelAName: state.modelA.name,               // ✅ "gpt-5-mini"
  modelBName: state.modelB.name,               // ✅ "moonshot-v1-128k"
  modelAPersonality: state.modelA,             // ✅ Includes personaId
  modelBPersonality: state.modelB,             // ✅ Includes personaId
  totalTurns: state.currentTurn,
  config,
  // LEGACY: Also include GPT/Claude for backward compatibility
  gptMessages: state.gptMessages,               // ⚠️ Empty array
  claudeMessages: state.claudeMessages,        // ⚠️ Empty array
  gptPersonality: state.personalityConfig.gpt,
  claudePersonality: state.personalityConfig.claude,
  accessCode: state.accessCode || undefined,
};
```

### Evidence 2: API Only Extracts Legacy Fields

**File:** `src/app/api/debate/oracle/route.ts`  
**Line:** 293

```typescript
const body: OracleAnalysisRequest & { accessCode?: string } = await request.json();
const { topic, gptMessages, claudeMessages, gptPersonality, claudePersonality, totalTurns, config } = body;
// ❌ Missing: modelAMessages, modelBMessages, modelAName, modelBName, modelAPersonality, modelBPersonality
```

### Evidence 3: Prompt Builder Uses Empty Arrays

**File:** `src/app/api/debate/oracle/route.ts`  
**Lines:** 265-275 (buildOraclePrompt)

```typescript
// Add GPT messages
prompt += "GPT-4 RESPONSES:\n";
request.gptMessages.forEach((msg, index) => {  // ❌ Empty array, no messages
  prompt += `Turn ${index + 1}: ${msg.text}\n\n`;
});

// Add Claude messages
prompt += "CLAUDE RESPONSES:\n";
request.claudeMessages.forEach((msg, index) => {  // ❌ Empty array, no messages
  prompt += `Turn ${index + 1}: ${msg.text}\n\n`;
});
```

**File:** `src/app/api/debate/oracle/route.ts`  
**Lines:** 678-687 (buildEnhancedOraclePrompt)

```typescript
GPT-4 RESPONSES:`;

request.gptMessages.forEach((msg, index) => {  // ❌ Empty array, no messages
  prompt += `\nTurn ${index + 1}: ${msg.text}`;
});

prompt += `\n\nCLAUDE RESPONSES:`;
request.claudeMessages.forEach((msg, index) => {  // ❌ Empty array, no messages
  prompt += `\nTurn ${index + 1}: ${msg.text}`;
});
```

### Evidence 4: Type Definition Missing Flexible Fields

**File:** `src/types/oracle.ts`  
**Lines:** 72-80

```typescript
export interface OracleAnalysisRequest {
  topic: string;
  gptMessages: any[];           // ❌ Legacy field only
  claudeMessages: any[];        // ❌ Legacy field only
  gptPersonality: any;          // ❌ Legacy field only
  claudePersonality: any;       // ❌ Legacy field only
  totalTurns: number;
  config: OracleConfig;
  // ❌ Missing: modelAMessages, modelBMessages, modelAName, modelBName, modelAPersonality, modelBPersonality
}
```

---

## 5. ROOT CAUSE DETERMINATION

**Primary Root Cause:** **Scenario C - Messages parsed but not used in prompt**

**Supporting Evidence:**
- ✅ Messages ARE being sent from frontend (Evidence 1)
- ✅ Messages ARE in request body (but not extracted)
- ❌ Messages NOT extracted in API route (Evidence 2)
- ❌ Messages NOT used in prompt builder (Evidence 3)
- ❌ Type definition doesn't include flexible fields (Evidence 4)

**Secondary Issues:**
- Type definition mismatch prevents TypeScript from catching the bug
- Two prompt builder functions (`buildOraclePrompt` and `buildEnhancedOraclePrompt`) both have same bug
- Hardcoded model names ("GPT-4", "Claude") instead of dynamic names

---

## 6. RECOMMENDED FIX

### Step 1: Update Type Definition

**File:** `src/types/oracle.ts`  
**Lines:** 72-80

```typescript
export interface OracleAnalysisRequest {
  topic: string;
  totalTurns: number;
  config: OracleConfig;
  
  // ✅ PRIMARY: Flexible model system
  modelAMessages?: Message[];
  modelBMessages?: Message[];
  modelAName?: string;
  modelBName?: string;
  modelAPersonality?: ModelConfiguration;
  modelBPersonality?: ModelConfiguration;
  
  // ⚠️ LEGACY: Backward compatibility (deprecated)
  gptMessages?: any[];
  claudeMessages?: any[];
  gptPersonality?: any;
  claudePersonality?: any;
}
```

### Step 2: Update API Route Extraction

**File:** `src/app/api/debate/oracle/route.ts`  
**Line:** 293

```typescript
const body: OracleAnalysisRequest & { accessCode?: string } = await request.json();
const { 
  topic, 
  // ✅ PRIMARY: Extract flexible model data
  modelAMessages = [],
  modelBMessages = [],
  modelAName,
  modelBName,
  modelAPersonality,
  modelBPersonality,
  totalTurns, 
  config,
  // ⚠️ LEGACY: Fallback to legacy fields if flexible not available
  gptMessages = [],
  claudeMessages = [],
  gptPersonality,
  claudePersonality
} = body;
const accessCode = (body as any).accessCode as string | undefined;

// ✅ Determine which data to use (prefer flexible, fallback to legacy)
const messagesA = modelAMessages.length > 0 ? modelAMessages : gptMessages;
const messagesB = modelBMessages.length > 0 ? modelBMessages : claudeMessages;
const nameA = modelAName || 'GPT';
const nameB = modelBName || 'Claude';
```

### Step 3: Update Prompt Builders

**File:** `src/app/api/debate/oracle/route.ts`  
**Function:** `buildOraclePrompt` (lines 246-286)

```typescript
const buildOraclePrompt = (
  request: OracleAnalysisRequest,
  config: OracleConfig
): string => {
  // ... existing prompt setup ...
  
  // ✅ Use flexible model data with fallback
  const messagesA = request.modelAMessages?.length > 0 
    ? request.modelAMessages 
    : request.gptMessages || [];
  const messagesB = request.modelBMessages?.length > 0 
    ? request.modelBMessages 
    : request.claudeMessages || [];
  
  // ✅ Get display names and persona names
  const { getModelDisplayName } = await import('@/lib/modelConfigs');
  const { PERSONAS } = await import('@/lib/personas');
  
  const nameA = request.modelAName 
    ? getModelDisplayName(request.modelAName as AvailableModel)
    : 'GPT-4';
  const nameB = request.modelBName 
    ? getModelDisplayName(request.modelBName as AvailableModel)
    : 'Claude';
  
  const personaA = request.modelAPersonality?.personaId 
    ? PERSONAS[request.modelAPersonality.personaId]?.name 
    : null;
  const personaB = request.modelBPersonality?.personaId 
    ? PERSONAS[request.modelBPersonality.personaId]?.name 
    : null;
  
  const labelA = personaA ? `${personaA} (${nameA})` : nameA;
  const labelB = personaB ? `${personaB} (${nameB})` : nameB;
  
  // ✅ Use dynamic labels and actual messages
  prompt += `${labelA} RESPONSES:\n`;
  messagesA.forEach((msg, index) => {
    prompt += `Turn ${index + 1}: ${msg.text}\n\n`;
  });
  
  prompt += `${labelB} RESPONSES:\n`;
  messagesB.forEach((msg, index) => {
    prompt += `Turn ${index + 1}: ${msg.text}\n\n`;
  });
  
  // ... rest of prompt ...
};
```

**File:** `src/app/api/debate/oracle/route.ts`  
**Function:** `buildEnhancedOraclePrompt` (lines 653-705)

Apply same changes to this function.

### Step 4: Add Debug Logging

**File:** `src/app/api/debate/oracle/route.ts`  
**After line 293**

```typescript
console.log('🔮 ORACLE DEBUG: Request data received', {
  topic: topic.substring(0, 50),
  modelAMessagesCount: modelAMessages?.length || 0,
  modelBMessagesCount: modelBMessages?.length || 0,
  modelAName,
  modelBName,
  modelAPersonaId: modelAPersonality?.personaId,
  modelBPersonaId: modelBPersonality?.personaId,
  legacyGptMessagesCount: gptMessages?.length || 0,
  legacyClaudeMessagesCount: claudeMessages?.length || 0,
  usingFlexibleData: (modelAMessages?.length || 0) > 0
});
```

---

## 7. TESTING CHECKLIST

After implementing the fix:

- [ ] Test with flexible model data (GPT-5 Mini vs Kimi 128K with personas)
- [ ] Verify Oracle receives actual debate messages
- [ ] Verify Oracle uses correct model names (not "GPT-4"/"Claude")
- [ ] Verify Oracle includes persona names in analysis
- [ ] Test with legacy data (backward compatibility)
- [ ] Verify both prompt builders (`buildOraclePrompt` and `buildEnhancedOraclePrompt`) work
- [ ] Check console logs to confirm data flow
- [ ] Verify Oracle analyzes full debate exchange, not just topic

---

## 8. IMPLEMENTATION PRIORITY

**Priority:** 🔴 **CRITICAL** - This completely breaks Oracle functionality for flexible model system

**Estimated Time:** 1-2 hours

**Risk Level:** Low - Changes are additive (add flexible support, keep legacy fallback)

**Breaking Changes:** None - Backward compatible with legacy fields

---

## SUMMARY

**Root Cause:** Oracle API route ignores flexible model data (`modelAMessages`, `modelBMessages`) and only uses empty legacy fields (`gptMessages`, `claudeMessages`), causing Oracle to analyze topics instead of actual debate exchanges.

**Fix Required:** Update type definition, API route extraction, and both prompt builder functions to use flexible model data with legacy fallback.

**Files to Modify:**
1. `src/types/oracle.ts` - Add flexible fields to interface
2. `src/app/api/debate/oracle/route.ts` - Extract flexible data, update prompt builders

**Investigation Complete** ✅  
**Ready for Implementation** ✅

