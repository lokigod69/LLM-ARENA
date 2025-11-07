# Oracle Integration Overview

## Configuration Sources

- `src/types/oracle.ts`
  - `ORACLE_CAPABLE_MODELS`: string literal union aligned with `AvailableModel`; determines which debate models can be chosen as oracle engines.
  - `ORACLE_MODEL_STRENGTHS`: descriptive mapping shown in UI for each oracle-capable model.
  - `DEFAULT_ORACLE_MODEL`: defaults to `deepseek-r1`.
  - Oracle enums (`OracleLens`, `OracleOutputFormat`, etc.) and config interfaces drive UI and prompt construction.

## Runtime Integration

- `src/lib/orchestrator.ts`
  - `callDeepSeekOracle`: legacy single-model oracle using DeepSeek R1 with 32k tokens and low temperature.
  - `callFlexibleOracle(prompt, modelName)`: main entry point; routes to provider-specific oracle helper based on model `provider`.
  - Provider-specific oracle helpers mirror debate helpers:
    - `callOpenAIOracle`, `callAnthropicOracle`, `callDeepSeekOracleFlexible`, `callGrokOracle`, `callOpenRouterOracle`, `callGeminiOracle`.
  - `getOracleModelConfig(modelName)`: per-model `{ maxTokens, temperature }` presets (mostly 0.1 temperature, max tokens tuned per provider).
  - Oracle system prompts built via `buildOracleSystemPrompt()` and `buildFlexibleOracleSystemPrompt()` (same file).

## Enabling a New Oracle Model

1. Add model id to `ORACLE_CAPABLE_MODELS` in `src/types/oracle.ts`.
2. Provide descriptive entry in `ORACLE_MODEL_STRENGTHS` (same file).
3. Ensure `getOracleModelConfig` returns sensible `{ maxTokens, temperature }` defaults for the new model.
4. Confirm provider-specific oracle helper handles the provider (if reusing existing helper, no code change required beyond type unions).

## Prompt Architecture

- Oracle prompts differ from debate system prompts; they emphasize analysis, verdict options, and bias detection.
- System prompt builders inject lens, depth, and bias configuration; user content is the compiled debate transcript.

## Mock / Error Handling

- Missing API keys trigger mock oracle output via `generateMockOracleAnalysis` (pre-existing function) with clear console warnings.
- Any runtime error during provider call falls back to mock analysis to avoid UI failure.
