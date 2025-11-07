# Dependencies & Environment Structure

## Packages

- `package.json` contains no official AI SDKs (OpenAI/Anthropic/etc.). All provider calls use native `fetch`.
- Key runtime dependencies:
  - `next`, `react`, `react-dom`: core application framework.
  - `dotenv`: allows local environment loading during scripts.
  - Misc UI/utility libs: `framer-motion`, `lucide-react`, `nanoid`, `uuid`.
- Dev tooling: `typescript`, `eslint`, `tailwindcss`, etc.

## Environment Variables

Common pattern: each model config references `apiKeyEnv` which maps to `process.env[API_KEY_NAME]`.

Expected variables based on `MODEL_CONFIGS`:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `DEEPSEEK_API_KEY`
- `GOOGLE_AI_API_KEY`
- `GROK_API_KEY`
- `OPENROUTER_API_KEY`
- `MOONSHOT_API_KEY`

Additional toggles:

- `