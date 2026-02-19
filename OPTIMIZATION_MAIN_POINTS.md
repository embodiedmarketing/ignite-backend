# Optimization Main Points — Ignite Backend

- **Schema** — Removed duplicate `src/shared/schema.ts`; single source of truth in `src/models/schema.ts`
- **AI provider** — Switched from OpenAI to Claude (Anthropic); removed OpenAI from dependencies
- **Validation** — All AI responses validated with Zod; no raw `JSON.parse` on AI output
- **Prompts** — Centralized shared prompts in `src/shared/prompts.ts` for reuse and cost reduction
- **Voice & branding** — Single provider; consistent “You are an expert…” voice; no third-party product names in prompts
- **Content ideas** — Fixed object vs array mismatch; validate `{ ideas: [...] }` shape
- **Messaging strategy** — Condensed prompts (~50–60% fewer tokens); adjusted `max_tokens` and temperature
- **Instruction order** — “Before you start” moved to the top of prompts for clarity
- **Conflicts** — Single priority rule for sales page (~300–400 words per section)
- **Documentation** — JSDoc added for `parseAndValidateAiJson`; schema validation enforced for all JSON outputs
