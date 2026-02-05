# Optimization Report — Ignite Backend

**Generated:** 5 February 2025  
**Last updated:** (Session: prompt optimization, validation fix, instruction order, conflicts)  
**Scope:** Code quality, AI provider consolidation, output validation, prompt consolidation, and instruction/scattering fixes.

---

## 1. Duplicate Files & Code Cleanup

### Removed Duplicate Files

- `**src/shared/schema.ts**` — Deleted (duplicate of `src/models/schema.ts`). The application uses only `src/models/schema.ts` (imported in `src/config/db.ts`). The shared copy was unused and could drift from the canonical schema.

### Documentation Updates

- `**src/shared/types.ts**` — Comment updated: database-related types are documented as living in `models/schema.ts` (exported via `@backend/models`) instead of the removed `shared/schema.ts`.

### Result

- Single source of truth for database schema.
- No duplicate schema files; reduced maintenance risk.

---

## 2. AI Provider: OpenAI → Claude (Anthropic)

### Code & Comments

- `**src/controllers/utility.controller.ts**` — Error check now looks for `ANTHROPIC_API_KEY` (was `OPENAI_API_KEY`). Comment updated from "Initialize OpenAI" to "Initialize Claude (Anthropic) for all AI features."
- `**src/services/ai-video-script-generator.ts**` — Comment updated from "OpenAI GPT-4o-mini" to "Claude."
- `**src/services/ai-sales-page-generator.ts**` — Comment updated to "Claude (Anthropic) API calls."
- `**src/services/ai-offer-outline.ts**` — Log message updated from "OpenAI returned insufficient content" to "Claude returned insufficient content."
- `**src/services/ai-interactive-coach.service.ts**` — Error message updated from "No response from OpenAI" to "No response from Claude."
- `**src/services/ai-messaging-strategy.ts**` — Removed commented-out OpenAI `chat.completions` code; only Claude (`anthropic.messages.create`) remains.

### Dependencies & Config

- `**package.json**` — Removed the `openai` dependency. Ran `npm install` to update lockfile and `node_modules`.
- `**.env.example**` — Removed `OPENAI_API_KEY`, `OPENAI_API_KEY_2`, `OPENAI_API_KEY3`. Kept `ANTHROPIC_API_KEY` as the single AI key.
- `**README.md**` — Env example updated to use `ANTHROPIC_API_KEY=your_anthropic_key` instead of `OPENAI_API_KEY`.

### Result

- All AI features use **Claude (Anthropic)** via `@anthropic-ai/sdk` and model `claude-sonnet-4-20250514`.
- No OpenAI references remain in `src/`. One AI provider and one env key for AI.

---

## 3. Zod Validation on All AI Responses

### Goal

Eliminate crashes and broken content when the AI returns malformed or unexpected data by validating every AI output with Zod.

### New Utilities

`**src/utils/ai-response.ts**`

- `**getTextFromAnthropicContent(content)**` — Safely extracts plain text from Anthropic `Message.content` (no crash on missing or non-text content).
- `**stripJsonMarkdown(raw)**` — Strips markdown code fences (e.g. `json ...` ) and extracts a single JSON object from model output.
- `**parseAndValidateAiJson<T>(rawText, schema, options)**` — Parses raw text as JSON (using `stripJsonMarkdown` when needed), validates with a Zod schema, returns typed data or uses `options.fallback` / throws with a clear message.
- `**validateAiText(raw, options)**` — Validates non-empty (and optionally minimum-length) text; supports `fallback` for empty/short content.

`**src/utils/ai-response-schemas.ts**`

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

- `**src/shared/index.ts**` — Added `export * from "./prompts"`.

### Result

- One definition per JSON instruction variant; services import and append.
- Shared system prompts for funnel, email types, interview, and core-offer.
- Fewer repeated tokens per request; one place to update wording for cost/quality tuning.

---

## 5. No Mixed Providers, Consistent Voice, No Brand Confusion

### Single AI provider

- All AI calls use **one provider** (Anthropic) and one model ID. No OpenAI or other providers in code or dependencies.

### Consistent voice and style

- `**src/shared/prompts.ts**` — Documented that system prompts use one voice: *"You are an expert..."* (formal, second person). No mixing of "You're" in system instructions.
- `**SYSTEM_MESSAGING_SYNTHESIS**` — Updated to start with *"You are an expert at enhancing..."* so it matches the rest.
- `**src/services/ai-real-time-coach.service.ts**` — System prompt line changed from *"You're a collaborator"* to *"You are a collaborator"* for consistency.

### Brand confusion removed

- `**chatgpt-style-evaluators.ts**` renamed to `**coaching-evaluators.ts**` so the codebase does not reference another brand. Import in `ai-feedback.service.ts` updated.
- `**coaching-evaluators.ts**` — Header comment changed from "Claude Sonnet 4-style" to "Coaching-style evaluators" (rule-based; no external AI).
- `**ai-feedback.service.ts**` — Prompt no longer says *"Act like Claude Sonnet 4"*; it now says *"Help them expand their thoughts with depth and emotion"* so we don’t instruct the model to mimic a named product. Internal comments that only describe the API/model were neutralized where they implied a "style" to mimic.

### Result

- One AI provider; one consistent expert-coach voice in prompts; no third-party product names in prompt text or confusing filenames.

---

## Summary Table


| Area               | Action                                                                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema             | Removed duplicate `src/shared/schema.ts`; single source in `src/models/schema.ts`.                                                                                      |
| AI provider        | All AI uses Claude (Anthropic); OpenAI removed from code and deps.                                                                                                      |
| Env / README       | `ANTHROPIC_API_KEY` only; OpenAI keys removed from `.env.example` and README.                                                                                           |
| AI output safety   | Zod validation and safe text extraction for all AI responses.                                                                                                           |
| Prompts            | Shared JSON instructions and system prompts in `src/shared/prompts.ts`.                                                                                                 |
| Voice & brand      | Single provider; consistent "You are an expert..." voice; no ChatGPT/Claude in prompts or evaluator filename.                                                           |
| **Latest session** | Content-ideas object validation; messaging prompt shrink + max_tokens; instruction order; sales-page priority; parseAndValidateAiJson JSDoc; single-provider confirmed. |


---

## Files Touched (High Level)

- **New:** `src/utils/ai-response.ts`, `src/utils/ai-response-schemas.ts`, `src/shared/prompts.ts`, `RECENT_CHANGES_REPORT.md`.
- **Removed:** `src/shared/schema.ts`.
- **Updated:** `src/shared/index.ts`, `src/shared/types.ts`, `package.json`, `.env.example`, `README.md`, and many services under `src/services/` and `src/controllers/utility.controller.ts`.
- **Latest session:** `src/shared/prompts.ts`, `src/services/ai-messaging-strategy.ts`, `src/services/ai-content-strategy.ts`, `src/services/ai-sales-page-generator.ts`, `src/utils/ai-response-schemas.ts`, `src/utils/ai-response.ts`, `RECENT_CHANGES_REPORT.md`.

For exact diffs and line-level changes, use version control (e.g. `git log` and `git diff`).



## 6. Latest Session — Prompt Optimization, Validation, and Instruction Fixes 

This section documents changes made in the most recent session: content-ideas validation shape, messaging-strategy prompt length reduction, max_tokens tuning, instruction order, conflicting instructions, and schema-enforcement documentation.

---

### 6.1 Content Ideas: Object Validation (Not Array)

**Problem:** `/api/generate-content-ideas` was failing with Zod error *"Expected array, received object"* because the AI returned `{ "ideas": [...] }` while the code expected a raw array.

**Changes:**


| File                                      | Change                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `**src/utils/ai-response-schemas.ts**`    | `**contentIdeaSchema**` — Updated to match the prompt/API shape: `title`, `coreMessage`, `format`, `emotionalIntention`, `callToAction`, `category` (enum: contrarian                                                                                                                                                                            |
| `**src/services/ai-content-strategy.ts**` | Prompt updated to request a **JSON object** with an `"ideas"` key (e.g. `{ "ideas": [ ... ] }`). JSON extraction now looks for the first `{...}` in the response (object) instead of `[...]`. Validation uses `**contentIdeasResponseSchema**`; result is `parsed.ideas`. Removed unused imports: `z`, `contentIdeaSchema`, `PROMPT_JSON_ARRAY`. |


**Result:** Content-ideas API now validates and returns an object `{ ideas: ContentIdea[] }`; no more array/object mismatch.

---

### 6.2 Messaging Strategy: Prompt Length & Token Inefficiency (Issue 1)

**Problem:** Messaging strategy used ~2,000+ tokens of instructions (system ~800 lines, user template ~400 lines, regeneration ~200 lines). Best practice is 200–400 tokens for instructions; cost and consistency suffered.

**Changes:**


| File                                        | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `**src/shared/prompts.ts**`                 | `**SYSTEM_MESSAGING_STRATEGY**` — New short system prompt (~~160 tokens): role, structure rule (exact headings), voice/alignment, style (concise, tangible, no filler/hype), and one anti-drift checkpoint.~~ `**MESSAGING_REGENERATION_PREFIX**` ~~— New short regeneration instruction (~~50 words) for enhancing a previous strategy.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `**src/services/ai-messaging-strategy.ts**` | **System message** — Replaced the long inline block (~143 lines) with `SYSTEM_MESSAGING_STRATEGY`. **Regeneration context** — Replaced ~65 lines with a short block using `MESSAGING_REGENERATION_PREFIX` + previous strategy + feedback + focus areas. **Interview augmentation** — Replaced long “Section AUGMENTATION RULES” and section-by-section guide with one short paragraph. **User template (sections 1–11)** — Replaced long “CREATE A COMPLETE MESSAGING STRATEGY” and detailed per-section instructions (with many examples) with a compact outline: same 11 sections, one to three lines each. **Footer** — Replaced long “NEW GENERATION” and “ADDITIONAL CREATIVE DIRECTION” (and random variation arrays) with one line. Removed unused `randomVariation` log. |


**Result:** ~50–60% reduction in instruction tokens for this service; single source for system/regeneration text in `prompts.ts`.

---

### 6.3 Messaging Strategy: max_tokens and Temperature


| Call               | Before             | After              | Reason                                                   |
| ------------------ | ------------------ | ------------------ | -------------------------------------------------------- |
| Emotional insights | `max_tokens: 3000` | `max_tokens: 2000` | Output is a structured summary; 2k is sufficient.        |
| Main strategy      | `max_tokens: 5000` | `max_tokens: 4000` | 11-section doc rarely needs 5k; 4k keeps headroom.       |
| Main strategy      | `temperature: 0.9` | `temperature: 0.8` | Slightly more consistent output while keeping variation. |


**Files:** `src/services/ai-messaging-strategy.ts` (both `anthropic.messages.create` call sites).

---

### 6.4 Instruction Scattering (Issue 2)

**Problem:** Critical instructions were scattered (e.g. “BEFORE YOU START” appeared after 400+ lines); the model sees prompts top-to-bottom, so order matters.

**Changes:**


| File                                        | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `**src/services/ai-messaging-strategy.ts**` | **“Before you start” moved to the top** of the user message. New block `**beforeYouStart**`: (1) Use only audience, problems, outcomes, and voice from the data; (2) No generic entrepreneur/coach language; (3) Then fill the 11 sections with exact headings. **Order is now:** variationNote → regenerationContext → **beforeYouStart** → USER BUSINESS CONTEXT → (optional) CLIENT INTERVIEW INSIGHTS → **# MESSAGING STRATEGY** and the 11 sections. **Removed** the duplicate closing line (“Deliver concise, grounded copy. Every claim traceable to source data. Trusted-advisor tone only.”) so the system prompt is the single place for those rules. |


**Result:** Model sees “what to do first” → data → output structure; no repeated rules at the end.

---

### 6.5 Conflicting Instructions (Issue 3)

**Problem:** Competing goals (e.g. “be concise” vs “include all these details”; “under 500 words per section” vs “include all 15 elements”) made behavior arbitrary.

**Changes:**


| File                                          | Change                                                                                                                                                                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Messaging strategy**                        | System prompt already had one combined rule: “Concise, tangible outcomes, specific timeframes.” No separate “be concise” vs “add lots of detail.” Left as-is.                                                                             |
| `**src/services/ai-sales-page-generator.ts**` | Added a **single priority** before the structure rules: *“PRIORITY: Cover each required element below clearly. Keep each section tight (~300–400 words per section) so the full page is scannable and all 5 sections fit without bloat.”* |


**Result:** One clear instruction per flow: cover required elements and stay within ~300–400 words per section for the sales page.

---

### 6.6 Output Schema Enforcement (Issue 4)

**Problem:** Report stated that some code might use raw `JSON.parse` on AI output, risking crashes on markdown fences, missing fields, or wrong shape.

**Findings:** All services that expect **JSON** from the AI already use `**parseAndValidateAiJson**` with a Zod schema (email sequence, funnel copy, transcript parser, content ideas, interactive coach, etc.). No raw `JSON.parse(response.content)` on AI output was found.

**Change:**


| File                           | Change                                                                                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `**src/utils/ai-response.ts**` | **JSDoc for `parseAndValidateAiJson**` — Added: *“Use this for ALL AI responses that expect JSON — never raw JSON.parse on response content (avoids crashes from markdown fences, missing fields, or unexpected shape).”* |


**Result:** Convention is documented; existing usage already enforces schema validation for JSON outputs.

---

### 6.7 Mixed AI Providers (Issue 5)

**Finding:** The codebase was audited for OpenAI usage (`openai`, `createCompletion`, `chat.completions`). **No matches.** `**ai-email-sequence-generator.ts**` already uses **Anthropic** (`anthropic.messages.create`) and `**parseAndValidateAiJson**` with `emailSequenceResponseSchema`.

**Result:** No code changes. Single provider (Claude) confirmed.

---

### 6.8 Summary Table (Latest Session)


| Area                     | Action                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Content ideas API        | Validate object `{ ideas: [...] }`; prompt asks for object; schema and parsing updated.                                              |
| Messaging prompts        | Short system + regeneration in `prompts.ts`; condensed user template, regeneration, interview rules, section outline, footer.        |
| Token usage              | ~50–60% fewer instruction tokens for messaging strategy; max_tokens 3000→2000 (insights), 5000→4000 (strategy); temperature 0.9→0.8. |
| Instruction order        | “Before you start” first, then data, then 11-section outline; duplicate final reminder removed.                                      |
| Conflicting instructions | Sales page: one PRIORITY line (~300–400 words/section + cover all elements).                                                         |
| Schema enforcement       | JSDoc on `parseAndValidateAiJson`; confirmed all JSON AI outputs use it.                                                             |
| Providers                | Confirmed single provider (Claude); no OpenAI in codebase.                                                                           |


---

### 6.9 Files Touched (Latest Session)

- `**src/shared/prompts.ts**` — Added `SYSTEM_MESSAGING_STRATEGY`, `MESSAGING_REGENERATION_PREFIX`.
- `**src/services/ai-messaging-strategy.ts**` — System/regeneration/user message condensed; instruction order; max_tokens/temperature; beforeYouStart block.
- `**src/services/ai-content-strategy.ts**` — Content-ideas prompt and parsing switched to object `{ ideas }`; use `contentIdeasResponseSchema`.
- `**src/services/ai-sales-page-generator.ts**` — One PRIORITY line for section length + elements.
- `**src/utils/ai-response-schemas.ts**` — `contentIdeaSchema` and `contentIdeasResponseSchema` updated for object shape.
- `**src/utils/ai-response.ts**` — JSDoc for `parseAndValidateAiJson`.
- `**RECENT_CHANGES_REPORT.md**` — This section added and summary/table updated.

