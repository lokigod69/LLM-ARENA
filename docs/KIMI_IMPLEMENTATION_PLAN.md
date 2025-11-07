# Kimi Implementation Plan

## Step 0 – Prerequisites

- Acquire `MOONSHOT_API_KEY` and add to local `.env.local` (not committed).
- Confirm Moonshot API reachable from environment (`curl https://api.moonshot.cn/v1/chat/completions`).

## Step 1 – Extend Model Registry (src/lib/orchestrator.ts)

1. Append three entries to `MODEL_CONFIGS` before the `as const` terminator:
   ```typescript
   'moonshot-v1-8k': {
     provider: 'moonshot',
     endpoint: 'https://api.moonshot.cn/v1/chat/completions',
     modelName: 'moonshot-v1-8k',
     maxTokens: 4000,
     apiKeyEnv: 'MOONSHOT_API_KEY',
     costPer1kTokens: { input: 0.00015, output: 0.0025 },
     elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM', // placeholder voice
   },
   'moonshot-v1-32k': {
     provider: 'moonshot',
     endpoint: 'https://api.moonshot.cn/v1/chat/completions',
     modelName: 'moonshot-v1-32k',
     maxTokens: 16000,
     apiKeyEnv: 'MOONSHOT_API_KEY',
     costPer1kTokens: { input: 0.00015, output: 0.0025 },
     elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
   },
   'moonshot-v1-128k': {
     provider: 'moonshot',
     endpoint: 'https://api.moonshot.cn/v1/chat/completions',
     modelName: 'moonshot-v1-128k',
     maxTokens: 64000,
     apiKeyEnv: 'MOONSHOT_API_KEY',
     costPer1kTokens: { input: 0.00015, output: 0.0025 },
     elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
   },
   ```
2. Update the `getModelKey` normalization helper to map friendly aliases (e.g., "KIMI", "KIMI-128K").

## Step 2 – UI Display Config (src/lib/modelConfigs.ts)

- Add three entries mirroring model names with Moonshot color (e.g., `#FF6B35`).
- Example:
  ```typescript
  'moonshot-v1-128k': {
    name: 'moonshot-v1-128k',
    displayName: 'Kimi 128K',
    shortName: 'Kimi 128K',
    color: '#FF6B35',
    description: 'Moonshot AI\'s ultra-long-context model (128K tokens)'
  },
  ```
- Repeat for 8K and 32K variants with tailored descriptions.

## Step 3 – Type Augmentation (src/types/index.ts)

- Extend `AvailableModel` union:
  ```typescript
  | 'moonshot-v1-8k'
  | 'moonshot-v1-32k'
  | 'moonshot-v1-128k'
  ```

## Step 4 – Debate Routing (src/lib/orchestrator.ts)

1. Implement `callUnifiedMoonshot(messages, modelType, extensivenessLevel)`:
   - Clone Chat Completions payload from `callUnifiedOpenRouter` or GPT-4o section.
   - Clamp temperature: `temperature = clamp(params.temperature ?? 0.7, 0, 1)`.
   - If `temperature < 0.3 && n > 1`, log warning and raise to `0.3` (Moonshot restriction).
   - Auto-convert `tool_choice === 'required'` to `'auto'` if present.
   - Ensure any `response_format` is object-based (`{ type: 'json_object' }`).
   - Use `timedFetch` with 60–90s timeout.
   - Parse response same as OpenAI Chat completions (`data.choices[0].message.content`).
   - Compute token usage from `data.usage` (Moonshot mirrors OpenAI fields).
2. Extend provider switch in `processDebateTurn` with case `'moonshot'` calling new helper.

## Step 5 – Oracle Support

1. `src/types/oracle.ts`
   - Add `'moonshot-v1-128k'` (and optionally 8k/32k) to `ORACLE_CAPABLE_MODELS`.
   - Add strengths entry: `'moonshot-v1-128k': 'Long-context bilingual analysis, excels at evidence aggregation.'`
2. `getOracleModelConfig` (same file as helpful function) – add `{ maxTokens: 60000, temperature: 0.1 }` mapping.
3. `callFlexibleOracle` switch – add `'moonshot'` case delegating to `callUnifiedMoonshot` (reuse helper with oracle-specific `{ maxTokens, temperature }`).

## Step 6 – Environment & Verification

- Document new variable in README or deployment checklist: `MOONSHOT_API_KEY`.
- Update API verification route (`src/lib/verify-api-config.ts` + `src/app/api/verify-config/route.ts`) to check Moonshot key if those utilities are used.

## Step 7 – Testing Checklist

1. Dropdown includes all three Kimi variants with correct colors.
2. Debate: GPT-5 vs Kimi 128K → verify streaming output (non-stream) arrives without errors.
3. Persona test: assign Marcus Aurelius to Kimi → confirm Stoic evidence instructions respected.
4. Extensiveness: run with level 1 and 5 to check token clamping works.
5. Temperature boundary: set UI slider > 1 (if allowed) → confirm console log shows clamp to 1.0 and API success.
6. Oracle analysis: select Kimi 128K and run on saved debate → ensure summary returns; inspect token usage log.
7. Chinese prompt: run debate in Chinese to validate language handling.
8. Error path: temporarily blank `MOONSHOT_API_KEY` → confirm mock mode message or descriptive error.

## Step 8 – Documentation

- Create `docs/KIMI_IMPLEMENTATION_NOTES.md` post-implementation summarizing final configuration, known quirks (temperature clamp, tool choice), and testing results.
