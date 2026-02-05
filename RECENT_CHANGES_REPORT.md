# Recent Changes Report — Ignite Backend

**Generated:** February 2025  
**Scope:** Code quality, AI provider consolidation, output validation, and prompt consolidation for cost reduction.

---

## 1. Duplicate Files & Code Cleanup

### Removed Duplicate Files
- **`src/shared/schema.ts`** — Deleted (duplicate of `src/models/schema.ts`). The application uses only `src/models/schema.ts` (imported in `src/config/db.ts`). The shared copy was unused and could drift from the canonical schema.

### Documentation Updates
- **`src/shared/types.ts`** — Comment updated: database-related types are documented as living in `models/schema.ts` (exported via `@backend/models`) instead of the removed `shared/schema.ts`.

### Result
- Single source of truth for database schema.
- No duplicate schema files; reduced maintenance risk.

---

## 2. AI Provider: OpenAI → Claude (Anthropic)

### Code & Comments
- **`src/controllers/utility.controller.ts`** — Error check now looks for `ANTHROPIC_API_KEY` (was `OPENAI_API_KEY`). Comment updated from "Initialize OpenAI" to "Initialize Claude (Anthropic) for all AI features."
- **`src/services/ai-video-script-generator.ts`** — Comment updated from "OpenAI GPT-4o-mini" to "Claude."
- **`src/services/ai-sales-page-generator.ts`** — Comment updated to "Claude (Anthropic) API calls."
- **`src/services/ai-offer-outline.ts`** — Log message updated from "OpenAI returned insufficient content" to "Claude returned insufficient content."
- **`src/services/ai-interactive-coach.service.ts`** — Error message updated from "No response from OpenAI" to "No response from Claude."
- **`src/services/ai-messaging-strategy.ts`** — Removed commented-out OpenAI `chat.completions` code; only Claude (`anthropic.messages.create`) remains.

### Dependencies & Config
- **`package.json`** — Removed the `openai` dependency. Ran `npm install` to update lockfile and `node_modules`.
- **`.env.example`** — Removed `OPENAI_API_KEY`, `OPENAI_API_KEY_2`, `OPENAI_API_KEY3`. Kept `ANTHROPIC_API_KEY` as the single AI key.
- **`README.md`** — Env example updated to use `ANTHROPIC_API_KEY=your_anthropic_key` instead of `OPENAI_API_KEY`.

### Result
- All AI features use **Claude (Anthropic)** via `@anthropic-ai/sdk` and model `claude-sonnet-4-20250514`.
- No OpenAI references remain in `src/`. One AI provider and one env key for AI.

---

## 3. Zod Validation on All AI Responses

### Goal
Eliminate crashes and broken content when the AI returns malformed or unexpected data by validating every AI output with Zod.

### New Utilities

**`src/utils/ai-response.ts`**
- **`getTextFromAnthropicContent(content)`** — Safely extracts plain text from Anthropic `Message.content` (no crash on missing or non-text content).
- **`stripJsonMarkdown(raw)`** — Strips markdown code fences (e.g. ` ```json ... ``` `) and extracts a single JSON object from model output.
- **`parseAndValidateAiJson<T>(rawText, schema, options)`** — Parses raw text as JSON (using `stripJsonMarkdown` when needed), validates with a Zod schema, returns typed data or uses `options.fallback` / throws with a clear message.
- **`validateAiText(raw, options)`** — Validates non-empty (and optionally minimum-length) text; supports `fallback` for empty/short content.

**`src/utils/ai-response-schemas.ts`**
- Central Zod schemas for AI response shapes: e.g. `parsedAnswersSchema`, `emailSequenceResponseSchema`, `interactiveCoachingResponseSchema`, `videoScriptOutputSchema`, `coachingEvaluationSchema`, `tripwireFunnelPagesSchema`, `funnelCopyPagesSchema`, `contentIdeaSchema`, `jsonObjectSchema`, and others used across services.

### Services Updated to Use Validation
- **Transcript / interview:** `ai-transcript-parser.ts` — `parseAndValidateAiJson` with `parsedAnswersSchema`; fallback to existing intelligent fallback on error.
- **Email sequence:** `ai-email-sequence-generator.ts` — `parseAndValidateAiJson` with `emailSequenceResponseSchema` (exactly 5 emails, required fields); validation errors treated as retryable.
- **Messaging strategy:** `ai-messaging-strategy.ts` — `validateAiText` for emotional insights and for raw strategy (min length 50).
- **Interactive coach:** `ai-interactive-coach.service.ts` — All JSON responses (general/offer analysis, improved versions, expansion) validated with `interactiveCoachingResponseSchema` or `improvedVersionsResponseSchema`.
- **Video scripts:** `ai-video-script-generator.ts` — `parseAndValidateAiJson` with `videoScriptOutputSchema`.
- **Offer / tripwire:** `ai-offer-outline.ts`, `ai-tripwire-outline.ts`, `ai-tripwire-templates.ts`, `ai-topic-idea-generator.ts` — Safe text extraction and/or `parseAndValidateAiJson` with appropriate schemas.
- **Core offer coach:** `ai-core-offer-coach.ts` — Evaluation, rewrite, and final summary validated with `coachingEvaluationSchema`, `coreOfferRewriteResultSchema`, `coreOfferFinalSummarySchema`.
- **Section coach:** `ai-core-outline-section-coach.ts` — Section evaluation and rewrite with `sectionEvaluationSchema`, `sectionRewriteResultSchema`.
- **Sales page:** `ai-sales-page-generator.ts`, `ai-sales-page-coach.ts` — Safe text extraction; coach section analysis with `salesPageSectionAnalysisSchema`.
- **Feedback / real-time:** `ai-feedback.service.ts`, `ai-real-time-coach.service.ts` — All AI text via `getTextFromAnthropicContent`.
- **Customer / avatar:** `ai-customer-locations.service.ts`, `ai-customer-experience-generator.ts`, `ai-avatar-synthesis.service.ts` — JSON validated with `recordOrObjectSchema`, `jsonObjectSchema`, or `avatarSynthesisSchema` where applicable.
- **Content strategy:** `ai-content-strategy.ts` — Text extraction + `parseAndValidateAiJson` for content ideas array.
- **Launch emails:** `ai-launch-email-generator.ts` — `parseAnthropicResponse` uses `parseAndValidateAiJson` with `jsonObjectSchema`; text extraction via `getTextFromAnthropicContent`.
- **Funnel copy:** `ai-funnel-copy-generator.ts` — `parseAndValidateAiJson` with `funnelCopyPagesSchema`.
- **Interview processor:** `ai-intelligent-interview-processor.ts` — Both JSON code paths validated with `jsonObjectSchema`.
- **Utility controller:** `utility.controller.ts` — All three places that read Claude output (registration funnel, sales page, Vimeo transcript summary) use `getTextFromAnthropicContent`.

### Result
- No raw `JSON.parse` on AI output outside the central validator (which then runs Zod).
- No direct `response.content[0]` access; all AI text via `getTextFromAnthropicContent`.
- Malformed or out-of-shape AI responses are caught and either trigger fallbacks or clear errors instead of crashes.

---

## 4. Consolidated Prompts for Cost Reduction

### Goal
Reduce duplicate prompt text across the codebase to cut token usage and enable a single place to tune instructions (~50% cost reduction potential when combined with other optimizations).

### New Module: `src/shared/prompts.ts`

**JSON output instructions (single place, reused everywhere):**
- `PROMPT_JSON_ONLY` — Standard “return only valid JSON, no markdown.”
- `PROMPT_JSON_ARRAY` — For JSON array responses.
- `PROMPT_JSON_ESCAPED` — For launch emails (properly escaped JSON).
- `PROMPT_JSON_STRUCTURE` — “Requested structure.”
- `PROMPT_JSON_IMPROVED_VERSIONS` — For `improvedVersions` array.

**System prompt constants:**
- **Funnel:** `SYSTEM_FUNNEL_JSON` (tripwire + funnel copy).
- **Email:** `SYSTEM_EMAIL_COPYWRITER_BASE`, `SYSTEM_EMAIL_WARM`, `SYSTEM_EMAIL_NURTURE`, `SYSTEM_EMAIL_REMINDER`, `SYSTEM_EMAIL_SALES`.
- **Interview/transcript:** `SYSTEM_INTERVIEW_ANALYST`, `SYSTEM_CUSTOMER_RESEARCH_ANALYST`, `SYSTEM_MESSAGING_SYNTHESIS`.
- **Core offer:** `SYSTEM_CORE_OFFER_SECTION_EVALUATE`, `SYSTEM_CORE_OFFER_SECTION_REWRITE`.
- **Other:** `SYSTEM_MESSAGING_EMOTIONAL_INSIGHTS`, `SYSTEM_CUSTOMER_LOCATIONS`.

### Services Refactored to Use Shared Prompts
- **ai-transcript-parser** — `PROMPT_JSON_STRUCTURE` + `SYSTEM_INTERVIEW_ANALYST`.
- **ai-tripwire-templates** — `PROMPT_JSON_ONLY` + `SYSTEM_FUNNEL_JSON`.
- **ai-funnel-copy-generator** — `PROMPT_JSON_ONLY` + `SYSTEM_FUNNEL_JSON`.
- **ai-intelligent-interview-processor** — `PROMPT_JSON_ONLY` + `SYSTEM_CUSTOMER_RESEARCH_ANALYST` + `SYSTEM_MESSAGING_SYNTHESIS`.
- **ai-video-script-generator** — `PROMPT_JSON_ONLY`.
- **ai-interactive-coach.service** — `PROMPT_JSON_ONLY` + `PROMPT_JSON_IMPROVED_VERSIONS`.
- **ai-topic-idea-generator** — `PROMPT_JSON_ONLY`.
- **ai-sales-page-coach** — `PROMPT_JSON_ONLY`.
- **ai-avatar-synthesis** — `PROMPT_JSON_ONLY`.
- **ai-customer-locations** — `PROMPT_JSON_ONLY` + `SYSTEM_CUSTOMER_LOCATIONS`.
- **ai-core-offer-outline** — `PROMPT_JSON_ONLY`.
- **ai-core-offer-coach** — `PROMPT_JSON_ONLY` (×3).
- **ai-core-outline-section-coach** — `PROMPT_JSON_ONLY` (×2) + `SYSTEM_CORE_OFFER_SECTION_*`.
- **ai-customer-experience-generator** — `PROMPT_JSON_ONLY` (×4).
- **ai-content-strategy** — `PROMPT_JSON_ARRAY`.
- **ai-messaging-strategy** — `SYSTEM_MESSAGING_EMOTIONAL_INSIGHTS`.
- **ai-launch-email-generator** — `PROMPT_JSON_ESCAPED` + all five `SYSTEM_EMAIL_*` (removed five duplicate system prompt strings).

### Export
- **`src/shared/index.ts`** — Added `export * from "./prompts"`.

### Result
- One definition per JSON instruction variant; services import and append.
- Shared system prompts for funnel, email types, interview, and core-offer.
- Fewer repeated tokens per request; one place to update wording for cost/quality tuning.

---

## 5. No Mixed Providers, Consistent Voice, No Brand Confusion

### Single AI provider
- All AI calls use **one provider** (Anthropic) and one model ID. No OpenAI or other providers in code or dependencies.

### Consistent voice and style
- **`src/shared/prompts.ts`** — Documented that system prompts use one voice: *"You are an expert..."* (formal, second person). No mixing of "You're" in system instructions.
- **`SYSTEM_MESSAGING_SYNTHESIS`** — Updated to start with *"You are an expert at enhancing..."* so it matches the rest.
- **`src/services/ai-real-time-coach.service.ts`** — System prompt line changed from *"You're a collaborator"* to *"You are a collaborator"* for consistency.

### Brand confusion removed
- **`chatgpt-style-evaluators.ts`** renamed to **`coaching-evaluators.ts`** so the codebase does not reference another brand. Import in `ai-feedback.service.ts` updated.
- **`coaching-evaluators.ts`** — Header comment changed from "Claude Sonnet 4-style" to "Coaching-style evaluators" (rule-based; no external AI).
- **`ai-feedback.service.ts`** — Prompt no longer says *"Act like Claude Sonnet 4"*; it now says *"Help them expand their thoughts with depth and emotion"* so we don’t instruct the model to mimic a named product. Internal comments that only describe the API/model were neutralized where they implied a "style" to mimic.

### Result
- One AI provider; one consistent expert-coach voice in prompts; no third-party product names in prompt text or confusing filenames.

---

## Summary Table

| Area                    | Action                                                                 |
|-------------------------|------------------------------------------------------------------------|
| Schema                  | Removed duplicate `src/shared/schema.ts`; single source in `src/models/schema.ts`. |
| AI provider             | All AI uses Claude (Anthropic); OpenAI removed from code and deps.     |
| Env / README            | `ANTHROPIC_API_KEY` only; OpenAI keys removed from `.env.example` and README. |
| AI output safety        | Zod validation and safe text extraction for all AI responses.          |
| Prompts                 | Shared JSON instructions and system prompts in `src/shared/prompts.ts`. |
| Voice & brand           | Single provider; consistent "You are an expert..." voice; no ChatGPT/Claude in prompts or evaluator filename. |

---

## Files Touched (High Level)

- **New:** `src/utils/ai-response.ts`, `src/utils/ai-response-schemas.ts`, `src/shared/prompts.ts`, `RECENT_CHANGES_REPORT.md`.
- **Removed:** `src/shared/schema.ts`.
- **Updated:** `src/shared/index.ts`, `src/shared/types.ts`, `package.json`, `.env.example`, `README.md`, and many services under `src/services/` and `src/controllers/utility.controller.ts`.

For exact diffs and line-level changes, use version control (e.g. `git log` and `git diff`).
