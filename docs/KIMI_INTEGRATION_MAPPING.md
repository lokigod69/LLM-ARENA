# Kimi (Moonshot) Integration Mapping

## Reference Model

- Closest implementation: Grok + Qwen via `callUnifiedGrok`/`callUnifiedOpenRouter` (OpenAI-compatible chat completions).
- Rationale: Kimi exposes `POST https://api.moonshot.cn/v1/chat/completions` with OpenAI schema, so we can extend the existing OpenAI-compatible pathway rather than creating a new protocol.

## Config Insertion Points

1. `src/lib/orchestrator.ts`
   - Extend `MODEL_CONFIGS` with three entries:
     - `'moonshot-v1-8k'`
     - `'moonshot-v1-32k'`
     - `'moonshot-v1-128k'`
   - Fields:
     - `provider: 'moonshot'`
     - `endpoint: 'https://api.moonshot.cn/v1/chat/completions'`
     - `modelName: 'moonshot-v1-8k'` (or `32k`/`128k`)
     - `maxTokens`: set near context limit (e.g., 4096 / 16384 / 64000) but still use extensiveness override.
     - `apiKeyEnv: 'MOONSHOT_API_KEY'`
     - `costPer1kTokens: { input: 0.00015, output: 0.0025 }` (USD ≈ $0.15 / $2.50 per 1M).
     - `elevenLabsVoiceId`: choose placeholder (e.g., reuse OpenAI default) until dedicated voice selected.
   - Append before `as const` terminator.

2. `src/lib/modelConfigs.ts`
   - Add display configs for each variant with Moonshot branding (color suggestion from brand orange `#FF6B35`).
   - Description examples:
     - "Moonshot AI's Kimi 8K – fast bilingual assistant"
     - "Moonshot AI's Kimi 32K – extended reasoning"
     - "Moonshot AI's Kimi 128K – ultra-long context analyzer".

3. `src/types/index.ts`
   - Extend `AvailableModel` union with the three string literals.

## API Call Routing

- `processDebateTurn` switch currently handles providers: `openai`, `anthropic`, `deepseek`, `google`, `grok`, `openrouter`.
- Add case for `'moonshot'`.

### Option A – Reuse `callUnifiedOpenAI`

- Update function signature to accept `'moonshot-v1-8k' | 'moonshot-v1-32k' | 'moonshot-v1-128k'`.
- Inside, detect Moonshot via `config.provider === 'moonshot'` or by model key.
- Use same Chat Completions code path (like GPT-4o Mini) but:
  - Clamp `temperature` to `[0, 1]` (Moonshot rejects >1).
  - Coerce `tool_choice: 'required'` to `'auto'` if ever set.
  - Ensure `response_format` is object `{ type: 'json_object' }` when JSON requested.

### Option B – New Helper

- Create `callUnifiedMoonshot(messages, modelType, extensivenessLevel)` replicating Chat Completions body but with Moonshot-specific guards.
- Advantage: isolates Moonshot constraints without widening OpenAI union types.
- `processDebateTurn` would dispatch to this helper under `'moonshot'` provider.

Recommended: **Option B** keeps TypeScript signature clean and localizes parameter validation.

## Parameter Validation Hooks

- Add Moonshot-specific guard before API call:
  - `temperature = Math.min(Math.max(temperature ?? 0.7, 0), 1)`
  - If `temperature < 0.3 && n > 1`, either raise friendly error or auto-adjust `temperature = 0.3`.
  - If payload includes `tool_choice === 'required'`, downgrade to `'auto'`.
  - When using `response_format`, ensure value is object `{ type: 'json_object' }`.

Implementation location options:

- Inside new helper function (preferred).
- Or extend existing payload builder if reusing OpenAI path.

## Oracle Mapping

- Add `'moonshot-v1-128k'` (and optionally other variants) to:
  - `ORACLE_CAPABLE_MODELS` array.
  - `ORACLE_MODEL_STRENGTHS` map (e.g., "Long-context bilingual analysis, excels at evidence aggregation").
  - `getOracleModelConfig` with `{ maxTokens: 64000, temperature: 0.1 }`.
- Add provider case `'moonshot'` in `callFlexibleOracle` switch and delegate to new helper (or reuse Chat Completions path with Moonshot endpoint).

## Dropdown / UI Impact

- `getAvailableModels()` derives from `MODEL_DISPLAY_CONFIGS`. Adding entries automatically populates UI selectors and persona assignment lists.
- Ensure new models have unique colors to avoid confusion.

## Environment

- Define `MOONSHOT_API_KEY` in `.env.local` / deployment environment.
- Update any verification scripts (e.g., `src/lib/verify-api-config.ts` or `src/app/api/verify-config/route.ts`) to include Moonshot key checks if required.

## Testing Targets

- Debate turn between Kimi and GPT-5 verifying English output quality.
- Persona overlay (Marcus Aurelius) to confirm evidence guidance compatibility.
- Extensiveness level sweep (1–5) to ensure max token logic works with large context.
- Oracle mode selecting Kimi 128K for long transcripts.
- Temperature boundary tests (e.g., slider > 1) to verify clamping.
