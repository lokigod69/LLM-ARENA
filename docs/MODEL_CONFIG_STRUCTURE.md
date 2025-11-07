# Model Config Structure

## Location

- File: `src/lib/orchestrator.ts`
- Constant: `MODEL_CONFIGS` (exported, `as const`)
- Keys: string ids matching `AvailableModel`

## Required Fields per Entry

- `provider` (string): identifies API family (`openai`, `anthropic`, `deepseek`, `google`, `grok`, `openrouter`).
- `endpoint` (string): fully qualified URL for HTTP POST requests.
- `modelName` (string): provider-specific identifier passed to API body.
- `maxTokens` (number): default safety cap; often overridden via extensiveness helper.
- `apiKeyEnv` (string): environment variable name used to load provider secret.
- `costPer1kTokens` (object): `{ input: number, output: number }` for cost estimation.
- `elevenLabsVoiceId` (string): fallback TTS voice mapped per model.

## Optional / Derived Behaviour

- No optional fields in current registry; all entries include the list above.
- Additional behaviour (streaming, retries, etc.) handled in provider-specific call functions, not in config.

## Example Entries

```typescript
'gpt-5': {
  provider: 'openai',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  modelName: 'gpt-5-2025-08-07',
  maxTokens: 200,
  apiKeyEnv: 'OPENAI_API_KEY',
  costPer1kTokens: { input: 0.00125, output: 0.01 },
  elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM'
},
'grok-4-fast-reasoning': {
  provider: 'grok',
  endpoint: 'https://api.x.ai/v1/chat/completions',
  modelName: 'grok-4-fast-reasoning',
  maxTokens: 200,
  apiKeyEnv: 'GROK_API_KEY',
  costPer1kTokens: { input: 0.0002, output: 0.0005 },
  elevenLabsVoiceId: 'BpjGufoPiobT79j2vtj4'
}
```

## Normalization Helpers

- `getModelKey(model: string): SupportedModel` converts UI/input labels into `MODEL_CONFIGS` keys.
- `SupportedModel` is inferred from `MODEL_CONFIGS` keys to keep type safety across providers.

## Insertion Guidance

- New entries must be appended before the `as const` terminator to preserve type inference.
- Ensure `AvailableModel` (in `src/types/index.ts`) includes matching string literal.
- Reuse existing pricing + voice patterns for consistency.
