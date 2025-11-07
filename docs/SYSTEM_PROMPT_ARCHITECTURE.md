# System Prompt Architecture

## Primary Builder

- Function: `generateSystemPrompt(...)`
- Location: `src/lib/orchestrator.ts`
- Parameters: `agentName`, `agreeabilityLevel`, `position`, `topic`, `maxTurns`, `extensivenessLevel`, `personaId`, `turnNumber`, `conversationHistory`, `model`.
- Responsibilities:
  - Computes effective agreeability/extensiveness (with persona overrides and slider influence).
  - Injects persona identity block when `personaId` is supplied (see `PERSONAS` registry).
  - Adds conversation recap for later turns and dynamic behavioral instructions.
  - Appends evidence guidance section and persona reminders.
  - Adds GPT-5 persona reinforcement block when the model id contains `gpt-5` variants.

## Evidence Guidance

- Helper: `getPersonaEvidenceGuidance(personaId)` in same file.
  - Returns persona-specific instructions (Stoic philosophy, thought experiments, etc.).
  - Fallback (`null`) triggers standard evidence guidance block with nine categories (academic, historical, cultural, philosophical, scientific, statistical, case study, literary, mythological).
- Evidence block inserted under "3. INTRODUCE NEW EVIDENCE" section inside `generateSystemPrompt`.
- Personas override the generic block when available; otherwise the diverse evidence list is shown.

## Extensiveness Handling

- Extensiveness slider influences:
  - `getExtensivenessInstructions(level)`: textual guidance (same file) mapping levels 1–5 to response expectations.
  - `getMaxTokensForExtensiveness(level)`: returns token ceilings (200–600) used by provider call helpers.
- Instructions appear under "2. Response Length" section of system prompt.
- Max token computation executed before API call (see `callUnified*` helpers) ensuring consistent enforcement.

## Model-Specific Adjustments

- GPT-5: Extra "FINAL CHARACTER REMINDER" appended when persona active (`model.includes('gpt-5')`).
- Other models currently share identical prompt structure; no per-provider modifications beyond GPT-5 persona reinforcement.

## Persona Integration

- Persona data from `PERSONAS` (identity, turn rules, locked traits) surfaces in prompt header.
- Persona turn rules appended under "Behavioral Anchors" with explicit do/do-not guidance.
- Agreeability slider is overridden by persona `lockedTraits.baseStubbornness` converted to agreeability.

## Conversation History

- For `turnNumber > 0`, function prepends a condensed summary of recent debate turns, preserving last 4 exchanges with speaker labels.
- Provides instructions to acknowledge previous opponent statements before advancing new evidence.

## Oracle Prompts

- Separate builders exist (`buildOracleSystemPrompt`, `buildFlexibleOracleSystemPrompt`) for analysis flows; they live further down in the same file and are not reused for debates.
