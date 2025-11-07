# API Calling Architecture

## Overview

Debate turns are routed through provider-specific helpers inside `src/lib/orchestrator.ts`. Each helper consumes the shared `MODEL_CONFIGS` entry, enforces provider expectations, and returns `{ reply, tokenUsage }`.

## Request Helpers

- `timedFetch(input, init, timeoutMs = 60000)`: wraps `fetch` with an abort controller to enforce request timeouts. All non-GPT-5 providers use this helper.
- `withTimeout(ms)`: legacy utility (currently unused after `timedFetch` refactor) that also provided abort controllers.

## Provider Functions

| Function | Models | Endpoint Style | Auth Pattern | Notes |
| --- | --- | --- | --- | --- |
| `callOpenAIResponses` | `gpt-5`, `gpt-5-mini`, `gpt-5-nano` | `POST /v1/responses` | `Bearer ${OPENAI_API_KEY}` | Extracts system instructions separately, builds `input` array, uses `max_output_tokens`, `reasoning.effort`, performs deep validation, logs verbose diagnostics. |
| `callUnifiedOpenAI` | Same as above + `gpt-4o-mini` | For GPT-5 delegates to `callOpenAIResponses`; for GPT-4o uses `POST /v1/chat/completions` | `Bearer` header | Sets `temperature: 0.7`, uses dynamic `max_tokens`, handles finish reasons, usage cost estimation. |
| `callUnifiedAnthropic` | `claude-3-5-sonnet-20241022`, `claude-haiku-4-5-20251001` | `POST /v1/messages` | `x-api-key` header + `anthropic-version` | Splits system prompt, sends `messages` array without system entries, manages max token truncation, calculates cost from usage. |
| `callUnifiedDeepSeek` | `deepseek-r1`, `deepseek-v3` | `POST /v1/chat/completions` | `Bearer ${DEEPSEEK_API_KEY}` | Adds `response_format: { type: 'text' }`, `temperature: 0.7`, logs finish reasons, estimates cost via `prompt_tokens` + `completion_tokens`. |
| `callUnifiedGrok` | `grok-4-fast-reasoning`, `grok-4-fast` | `POST https://api.x.ai/v1/chat/completions` | `Bearer ${GROK_API_KEY}` | Same request shape as OpenAI Chat Completions plus `streaming: false`, `temperature: 0.7`. Handles JSON/text fallback parsing. |
| `callUnifiedGemini` | `gemini-2.5-*` | `POST ...:generateContent` | `x-goog-api-key` query param (constructed via `endpoint` in config) | Builds `contents`/`systemInstruction` payload, maps role to Gemini format, handles candidate finish reasons, extracts text from nested arrays. |
| `callUnifiedOpenRouter` | `qwen3-max`, `qwen3-30b-a3b` | `POST https://openrouter.ai/api/v1/chat/completions` | `Authorization: Bearer ${OPENROUTER_API_KEY}` + `HTTP-Referer`, `X-Title` headers | Adds `provider` metadata from config comment, standard Chat Completions payload. |

## Streaming

- Current implementation performs non-streaming POST requests across all providers.
- Streaming logic is not enabled (no SSE readers); responses are awaited in full before returning.

## Authentication Patterns

- Each provider fetches API key via `process.env[config.apiKeyEnv]`.
- Missing keys throw descriptive errors before making network calls.
- `MOCK_MODE` (computed once) switches debate flow to simulation when required keys are absent; Grok/OpenRouter missing keys do not trigger mock mode.

## Error Handling Patterns

- After `fetch`, non-OK responses attempt `.json()` parsing; fallback to `.text()` for diagnostics.
- GPT-5 pathway logs full error objects including serialized response.
- All helpers throw descriptive `Error` instances (propagated to caller for UI handling).
- Timeout handling is centralized via `timedFetch` (throws `Provider request timed out after ...`).

## Integration Points

- `processDebateTurn` (later in file) selects provider helper based on `MODEL_CONFIGS[modelKey].provider`.
- Oracle analysis reuses the same helpers (distinct functions suffixed with `Oracle`).
- Adding a new provider entails creating a similar helper or leveraging `callUnifiedOpenAI` if endpoint is compatible.
