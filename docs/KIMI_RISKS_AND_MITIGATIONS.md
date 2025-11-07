# Kimi Integration – Risks & Mitigations

## 1. Temperature Range Violations
- **Risk**: Moonshot rejects `temperature > 1` or (`temperature < 0.3` with `n > 1`).
- **Mitigation**: Clamp temperature to `[0, 1]` before request. If `< 0.3` and `n > 1`, bump to `0.3` or reduce `n`. Log adjustments for visibility.

## 2. Tool Choice Incompatibility
- **Risk**: `tool_choice: 'required'` unsupported; can trigger 400 errors when debate tools enabled.
- **Mitigation**: Intercept payload and convert `'required'` to `'auto'` (Moonshot default). Document limitation in model description.

## 3. Response Format Requirements
- **Risk**: When requesting structured JSON, Moonshot expects `{ type: 'json_object' }`, not string literal.
- **Mitigation**: Normalize `response_format` to object form whenever JSON mode requested. Validate prior to API call.

## 4. Language Drift
- **Risk**: Kimi may default to Chinese responses, confusing English debates.
- **Mitigation**: Augment system prompt with explicit language instruction (e.g., "Respond in English unless otherwise requested"). Add regression test covering English + Chinese topics.

## 5. Latency & Timeouts
- **Risk**: Moonshot long-context calls (128K) may exceed default timeout, causing abort.
- **Mitigation**: Increase `timedFetch` timeout for Moonshot (e.g., 90s). Provide UI feedback for in-progress requests.

## 6. Pricing & Currency Ambiguity
- **Risk**: Moonshot publishes pricing in CNY; internal calculator expects USD.
- **Mitigation**: Confirm billing currency; if needed, convert to USD or annotate UI that pricing is approximate. Log raw usage for auditing.

## 7. Rate Limits / Quotas
- **Risk**: Unknown rate limits may break debates under heavy load.
- **Mitigation**: Add retry-with-backoff wrapper or surface rate-limit errors clearly. Monitor logs after deployment.

## 8. Missing Environmental Configuration
- **Risk**: Absent `MOONSHOT_API_KEY` sends debates into mock mode or throws errors.
- **Mitigation**: Update verification scripts and deployment checklist; fail fast with descriptive message pointing to env setup.

## 9. Dependency Drift
- **Risk**: Future Moonshot API changes (new endpoints/params) may break compatibility.
- **Mitigation**: Encapsulate Moonshot logic in dedicated helper, making future adjustments localized. Track API version announcements.
