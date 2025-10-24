# API Safety

## Current Behavior

- Quota enforcement (pre-decrement)
  - In `src/app/api/debate/step/route.ts`, quota is validated and decremented before calling the orchestrator.
  - If the call later fails, quota remains consumed (intentional to prevent abuse).

```61:71:src/app/api/debate/step/route.ts
if (accessCode !== process.env.ADMIN_ACCESS_CODE) {
  const codeData = await kv.get<CodeData>(accessCode);
  if (!codeData || !codeData.isActive || codeData.queries_remaining <= 0) {
    return NextResponse.json({ error: 'Access denied. Invalid or expired code.' }, { status: 403 });
  }
  const newQueriesRemaining = codeData.queries_remaining - 1;
  await kv.set(accessCode, { ...codeData, queries_remaining: newQueriesRemaining });
  queriesRemaining = newQueriesRemaining;
}
```

- Provider calls and error handling
  - All providers (`OpenAI`, `Anthropic`, `DeepSeek`, `Gemini`) throw on non-OK responses; route returns 500 JSON; frontend appends an error message and continues.

```393:409:src/lib/orchestrator.ts
if (!response.ok) {
  let errorMessage = `${modelType} API error: ${response.status}`;
  try { const errorData = await response.json(); errorMessage += ` - ${errorData.error?.message || 'Unknown error'}`; }
  catch { const textResponse = await response.text(); ... }
  throw new Error(errorMessage);
}
```

- No timeout protection
  - Provider `fetch` calls have no AbortController or timeout; long-hanging requests can stall a turn.

- No retry/backoff
  - Failures are surfaced immediately; no automatic retries (prevents runaway costs).

- Oracle analysis bypasses quota
  - `/api/debate/oracle` can invoke real providers and is not tied to access-code quota.

## Risks and Vulnerabilities

- CRITICAL: No server-side timeouts
  - A hung provider stalls the request, consumes server resources, and freezes UX until it resolves or platform times out.

- HIGH: Oracle bypasses quota
  - Users can trigger many Oracle analyses without decrementing credits, causing potential cost leaks.

- MEDIUM: Pre-decrement without rollback
  - Intentional design choice to prevent abuse; document clearly for users.

- LOW: Mock mode mismatch (client vs server)
  - Client uses `localStorage.MOCK_MODE`, server uses `process.env.MOCK_MODE`; can cause unexpected real usage.

## Proposed Fixes

1) Add Timeout Protection (Priority: Critical)
- Use `AbortController` with a 60s timeout for all provider calls:
  - `callUnifiedOpenAI`
  - `callUnifiedAnthropic`
  - `callUnifiedDeepSeek`
  - `callUnifiedGemini`
  - Oracle provider variants as well
- On timeout, throw a specific timeout error and let route return 500.

2) Tie Oracle to Quota (Priority: High)
- Option A (recommended): Oracle consumes 1 credit per analysis.
  - Add `accessCode` to Oracle request body and mirror the pre-decrement logic.
- Option B: Rate-limit Oracle per debate or time window (less strict than quota).

3) Keep Pre-decrement Behavior (Priority: Medium)
- Document as intentional; do not attempt rollback.

4) Typing Dependency Watchdog (Priority: Medium)
- Add a 30s watchdog in client: if `waitingForTypingRef` remains true too long, auto-trigger next turn.

5) Mock Mode Consistency (Priority: Low)
- Pass a `mockMode` flag from client to server (query or header) and have server respect it over env default.

## Open Questions / TODO

- [TODO] Implement timeouts across all provider calls with `AbortController` (60s default).
- [TODO] Decide Oracle policy (quota vs rate limit) and implement chosen approach.
- [TODO] Add client watchdog for typing dependency (30s).
- [TODO] Add server-acknowledged mock mode flag.
- [TODO] Consider exposing token usage in UI and/or storing a running total in exported debate data.
