# GPT-5 API Error & Character Impersonation Investigation Report

## Executive Summary

This report documents the investigation into two critical issues with GPT-5:
1. **API 400 Error**: "One of 'input' or 'previous_response_id' is 'prompt'; 'conversation_id' must be missing"
2. **Character Impersonation Failure**: GPT-5 not adhering to persona/character prompts like Grok and other models

## Issue 1: API 400 Error Analysis

### Error Message
```
GPT-5 Responses API error (400): One of "input" or "previous_response_id" is "prompt"; "conversation_id" must be missing
```

### Root Cause Analysis

**Current Implementation (src/lib/orchestrator.ts:611-972)**
- ✅ Uses correct endpoint: `https://api.openai.com/v1/responses`
- ✅ Extracts system message to `instructions` field
- ✅ Sanitizes messages to only include `role` and `content`
- ✅ Request body includes: `model`, `input`, `max_output_tokens`, `reasoning`, `text`, `store`, `instructions`
- ✅ Validation checks for forbidden fields (`prompt`, `prompts`, `previous_response_id`, `conversation_id`)

**Potential Issues:**
1. **Input Format**: The Responses API might require the `input` field to be a string in some cases, not an array
2. **Message Structure**: Messages might have nested invalid fields that aren't caught by current sanitization
3. **JSON Serialization**: There might be an issue with how the request body is serialized
4. **API Version/Model Mismatch**: The model name format might be incorrect

### Solution Plan

**Fix 1: Enhanced Input Validation**
- Add deeper validation of message objects to ensure no nested "prompt" fields
- Verify input array structure matches API expectations
- Add defensive checks before API call

**Fix 2: Input Format Verification**
- Ensure `input` is always an array of message objects with only `role` and `content`
- Remove any extraneous fields from message objects
- Add logging to capture exact request body being sent

**Fix 3: Error Handling Enhancement**
- Improve error logging to capture full request body when error occurs
- Add request/response interceptors for debugging

## Issue 2: Character Impersonation Failure

### Current Implementation

**System Prompt Structure (src/lib/orchestrator.ts:340-570)**
- Persona instructions are prepended to system prompt
- Format: `CRITICAL: You are {persona.name}...` + identity + turnRules
- Debating instructions follow persona section

**Comparison with Other Models:**
- **Grok**: Uses standard chat completions API with full messages array (including system)
- **Claude**: Uses separate `system` field for system prompt
- **GPT-5**: Uses `instructions` field (string) for system prompt, `input` array for messages

### Why GPT-5 Might Struggle

1. **Instructions Format**: GPT-5's `instructions` field might need more structured formatting
2. **Role-Play Emphasis**: GPT-5 may need more explicit "you ARE this character" directives
3. **Prompt Hierarchy**: The debate instructions might be overriding persona instructions
4. **Model Behavior**: GPT-5 might have different interpretation of character instructions

### Solution Plan

**Fix 1: Enhanced Persona Instructions for GPT-5**
- Add explicit role-play framing at the start
- Use stronger separation between persona identity and debate instructions
- Add reinforcement phrases throughout the prompt

**Fix 2: Model-Specific Prompt Formatting**
- Create GPT-5-specific prompt structure
- Use more direct, imperative language for character adherence
- Add explicit "stay in character" directives

**Fix 3: Prompt Structure Optimization**
```
[ROLE PLAY SECTION - STRONG FRAMING]
You ARE {persona.name}. Not acting AS them, but BEING them.
{persona.identity}
{persona.turnRules}

[DEBATE CONTEXT - SECONDARY]
You are participating in a debate...
[debate instructions]
```

## Implementation Priority

1. **CRITICAL**: Fix API 400 error (blocks all GPT-5 usage)
2. **HIGH**: Enhance character impersonation prompts (core feature)
3. **MEDIUM**: Add comprehensive logging for debugging
4. **LOW**: Optimize prompt structure for better performance

## Testing Plan

1. Test API call with minimal message array
2. Test with persona-enabled debate
3. Compare GPT-5 responses with Grok for same persona
4. Verify error handling and logging
5. Test edge cases (empty messages, long prompts, etc.)


