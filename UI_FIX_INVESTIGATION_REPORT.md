# UI FIX INVESTIGATION: Remove Redundant Model Name from Debate Turn Messages

**Date:** Investigation Complete  
**Status:** ✅ Ready for Implementation

---

## INVESTIGATION RESULTS

### Component Location

**File:** `src/components/ChatColumn.tsx`  
**Lines:** 278-290 (Message Display)  
**Component name:** `ChatColumn`

---

## Data Source

**✅ Frontend constructs display string**

The model name is being added in the frontend component itself. The code constructs the display string dynamically:

```typescript
// Lines 278-290 in ChatColumn.tsx
{(() => {
  // PROMPT 4: Show persona name if message has persona, otherwise model name
  if (message.personaId) {
    const persona = PERSONAS[message.personaId];
    if (persona) {
      const modelDisplayName = actualModelName 
        ? getModelDisplayName(actualModelName)
        : modelName;
      return `${persona.name.toUpperCase()} (${modelDisplayName})`;  // ← THIS LINE
    }
  }
  return (message.sender || modelName || 'UNKNOWN').toUpperCase();
})()}
```

**Data Flow:**
- `message.personaId` comes from the Message object
- `actualModelName` or `modelName` comes from component props
- Display string is constructed in the component render

---

## Current Code Snippet

**Location:** `src/components/ChatColumn.tsx` lines 274-290

```typescript
<span 
  className="text-xs font-matrix font-bold tracking-wider"
  style={{ color: colors.primary }}
>
  {(() => {
    // PROMPT 4: Show persona name if message has persona, otherwise model name
    if (message.personaId) {
      const persona = PERSONAS[message.personaId];
      if (persona) {
        const modelDisplayName = actualModelName 
          ? getModelDisplayName(actualModelName)
          : modelName;
        return `${persona.name.toUpperCase()} (${modelDisplayName})`;  // ← REMOVE MODEL NAME HERE
      }
    }
    return (message.sender || modelName || 'UNKNOWN').toUpperCase();
  })()}
</span>
```

---

## All Display Locations

### ✅ Location 1: Message Display (NEEDS FIX)
- **File:** `src/components/ChatColumn.tsx`
- **Lines:** 278-290
- **Current:** `DONALD TRUMP (Claude Haiku 4.5) •`
- **Should be:** `DONALD TRUMP •`

### ✅ Location 2: Header Display (KEEP AS-IS)
- **File:** `src/components/ChatColumn.tsx`
- **Lines:** 109-159
- **Current:** `NIETZSCHE (GPT-4O)` (in header)
- **Status:** User wants to KEEP this - it's the header showing model info
- **Note:** This is separate from message display and should remain unchanged

**Result:** Only ONE location needs to be changed (message display).

---

## Dependencies Found

### ✅ None (Safe to Change)

**Verification:**

1. **Logic Dependencies:** ❌ None
   - Model name is NOT used for filtering, sorting, or any logic
   - It's purely display text

2. **Accessibility:** ❌ Not used
   - Screen readers will still work fine with just persona name
   - Persona name is more meaningful than model name for accessibility

3. **CSS Selectors:** ❌ None
   - No CSS selectors target the model name specifically
   - The span element will remain unchanged

4. **Tests:** ❌ None found
   - No test files found that check for model name in message display
   - No test dependencies identified

5. **Data Storage:** ❌ Not stored
   - Messages are stored with `personaId` and `sender` fields
   - Display string is constructed on-the-fly, not stored

**Conclusion:** Safe to change - this is purely a display modification.

---

## Recommended Approach

### ✅ Option A: Frontend-Only Fix (RECOMMENDED)

**Why:** 
- Display string is constructed in frontend component
- No backend changes needed
- No data migration required
- Simple one-line change

**Change Required:**

**Before:**
```typescript
return `${persona.name.toUpperCase()} (${modelDisplayName})`;
```

**After:**
```typescript
return persona.name.toUpperCase();
```

**Impact:**
- ✅ Only affects message display
- ✅ Header remains unchanged (shows model name)
- ✅ No breaking changes
- ✅ No data migration needed

---

## Implementation Plan

### Step 1: Make the Change

**File:** `src/components/ChatColumn.tsx`  
**Line:** 286

**Change:**
```typescript
// BEFORE (line 286):
return `${persona.name.toUpperCase()} (${modelDisplayName})`;

// AFTER:
return persona.name.toUpperCase();
```

### Step 2: Remove Unused Variable (Optional Cleanup)

**Lines:** 283-285 can be removed since `modelDisplayName` is no longer used:

```typescript
// BEFORE:
const modelDisplayName = actualModelName 
  ? getModelDisplayName(actualModelName)
  : modelName;
return `${persona.name.toUpperCase()} (${modelDisplayName})`;

// AFTER:
return persona.name.toUpperCase();
```

**Note:** However, if `getModelDisplayName` import is used elsewhere in the file, keep the import.

---

## Testing Checklist

After implementation, verify:

- [ ] Active debate view shows only persona name in messages
- [ ] Header still shows persona name with model name (unchanged)
- [ ] Color coding still distinguishes speakers
- [ ] No broken layouts or CSS issues
- [ ] No console errors
- [ ] All debate types work (with/without personas)
- [ ] Messages without personas still show model name correctly
- [ ] Mobile view works correctly

---

## Expected Results

### Before Fix:
```
[Header]
NIETZSCHE (GPT-4O)  ← KEEP THIS

[Messages]
NIETZSCHE (GPT-4O) •  ← REMOVE MODEL NAME HERE
Look, beer's tremendous...

VLADIMIR PUTIN (Grok 4) •  ← REMOVE MODEL NAME HERE
You claim beer has flavor...
```

### After Fix:
```
[Header]
NIETZSCHE (GPT-4O)  ← UNCHANGED (KEEP)

[Messages]
NIETZSCHE •  ← MODEL NAME REMOVED
Look, beer's tremendous...

VLADIMIR PUTIN •  ← MODEL NAME REMOVED
You claim beer has flavor...
```

---

## Risk Assessment

**LOW RISK** ✅

- Pure display change
- No logic dependencies
- No data changes
- No breaking changes
- Simple one-line modification

---

## Summary

**Component:** `ChatColumn.tsx`  
**Change Type:** Display-only modification  
**Complexity:** Simple (1 line change)  
**Risk:** Low  
**Dependencies:** None  
**Backend Changes:** None  
**Data Migration:** None  

**Ready to implement!** ✅

