# Duplicate Files & Duplicated Code Report

This document lists duplicate files and repeated code patterns found in the codebase.

---

## 1. Duplicate files (same or near-identical content)

### 1.1 Controller duplicate (remove the copy)

| File | Status | Action |
|------|--------|--------|
| `src/controllers/interview-notes.controller.ts` | **In use** (imported by `src/routes/interview-notes.routes.ts`) | Keep |
| `src/controllers/interview-notes.controller copy.ts` | **Unused duplicate** | **Delete** – No route or import references this file. It appears to be an older copy with different behavior (e.g. transcriptId support). Merge any needed logic into `interview-notes.controller.ts` and remove the copy. |

---

### 1.2 Service file pairs (one is unused duplicate)

The app imports only the **`.service.ts`** versions. The non-`.service` files are duplicates and can be removed.

| In use (keep) | Duplicate (safe to remove) |
|---------------|----------------------------|
| `src/services/ai-real-time-coach.service.ts` | `src/services/ai-real-time-coach.ts` |
| `src/services/ai-avatar-synthesis.service.ts` | `src/services/ai-avatar-synthesis.ts` |
| `src/services/ai-customer-locations.service.ts` | `src/services/ai-customer-locations.ts` |
| `src/services/ai-interactive-coach.service.ts` | `src/services/ai-interactive-coach.ts` (verify no other imports first) |
| `src/services/ai-intelligent-prefill.service.ts` | `src/services/ai-intelligent-prefill.ts` (verify no other imports first) |

**References:**  
- `src/controllers/ai-coaching.controller.ts` imports from `ai-real-time-coach.service`, `ai-interactive-coach.service`, `ai-intelligent-prefill.service`.  
- `src/controllers/utility.controller.ts` imports from `ai-customer-locations.service`, `ai-avatar-synthesis.service`.

---

## 2. Migration files (duplicate indices / out-of-sync)

Under `migrations/`, several **manual** migration files reuse the same index numbers as **drizzle-generated** migrations. The journal (`migrations/meta/_journal.json`) only tracks the drizzle-named ones.

| In journal | Not in journal (orphan / duplicate index) |
|------------|-------------------------------------------|
| `0002_foamy_marten_broadcloak.sql` | `0002_fix_section_completions_constraint.sql` |
| `0004_charming_robin_chapel.sql` | `0004_add_coaching_call_recordings.sql` |
| `0005_mighty_stellaris.sql` | `0005_remove_user_id_from_coaching_call_recordings.sql` |
| `0006_smart_nick_fury.sql` | `0006_add_coaching_calls_schedule.sql`, `0006_smiling_warbird.sql` |
| `0007_hot_stellaris.sql` | `0007_add_recurring_to_coaching_calls_schedule.sql` |
| — | `0008_fix_coaching_call_recordings_sequence.sql` |
| — | `0009_add_onboarding_steps.sql` |
| — | `add_transcript_id_to_interview_notes.sql` |

**Recommendation:**  
- Decide which migrations have already been applied in each environment.  
- Either: (a) consolidate into a single migration history and remove or rename duplicates, or (b) keep manual scripts outside the drizzle journal (e.g. in `scripts/`) and document that they are run separately.  
- Avoid having two different migrations with the same index (e.g. two `0006_*.sql`).

---

## 3. Duplicated code patterns (refactor for DRY)

### 3.1 Controller error handling (repeated in many controllers)

The same try/catch and Zod/duplicate-key handling appears in multiple controllers, e.g.:

- `src/controllers/team-members.controller.ts`
- `src/controllers/faqs.controller.ts`
- `src/controllers/onboarding-steps.controller.ts`
- `src/controllers/journey-steps.controller.ts`
- `src/controllers/orientation-video.controller.ts`
- And others under `src/controllers/`

**Repeated pattern:**

```ts
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : "UnknownError";
  console.error("Error ...", { name: errorName, message: errorMessage, stack: ... });
  if (error instanceof Error && error.name === "ZodError") {
    const zodError = error as any;
    res.status(400).json({ message: "Invalid request data", details: zodError.errors || error.message });
    return;
  }
  if (error instanceof Error && error.message.includes("duplicate key")) {
    res.status(400).json({ message: "..." });
    return;
  }
  res.status(500).json({ message: "..." });
}
```

**Recommendation:**  
- Add a small helper in e.g. `src/utils/controller-error.ts`: e.g. `handleControllerError(error, res, { logLabel?, duplicateKeyMessage? })` that performs the above and sends the right status/body.  
- Use this helper in all these controllers so the logic lives in one place.

### 3.2 “Get by ID” + parse + 404 pattern

Many controllers repeat:

- Read `id` from `req.params`
- `parseInt(id, 10)` and check `isNaN`
- Call storage get/update/delete by id
- If not found, `res.status(404).json({ message: "..." })`

**Recommendation:**  
- Optional helper, e.g. `parseIdParam(req.params.id, res)` that returns the number or sends 400/404 and returns undefined, so controllers can do one `if (id === undefined) return;` then use `id`.

---

## 4. Broken / misleading references (fixed or to fix)

### 4.1 Fixed

- **`src/utils/database-migration.ts`**  
  - Previously imported `InsertMessagingStrategy`, `InsertWorkbookResponse` from `@shared/schema`.  
  - There is no `src/shared/schema.ts`; those types live in `src/models/schema.ts`.  
  - **Fix applied:** import changed from `@shared/schema` to `../models`.

### 4.2 Shared index

- **`src/shared/index.ts`**  
  - Contained `export * from "./schema"` but `src/shared/schema.ts` does not exist (schema lives under `src/models`).  
  - **Fix applied:** the `./schema` re-export was removed from `src/shared/index.ts` so the shared index only exports existing modules.

---

## 5. Summary checklist

| Item | Action |
|------|--------|
| `interview-notes.controller copy.ts` | Delete after merging any needed behavior into `interview-notes.controller.ts` |
| `ai-real-time-coach.ts` | Remove (duplicate of `ai-real-time-coach.service.ts`) |
| `ai-avatar-synthesis.ts` | Remove (duplicate of `ai-avatar-synthesis.service.ts`) |
| `ai-customer-locations.ts` | Remove (duplicate of `ai-customer-locations.service.ts`) |
| `ai-interactive-coach.ts` | Verify no imports, then remove if duplicate of `.service` |
| `ai-intelligent-prefill.ts` | Verify no imports, then remove if duplicate of `.service` |
| Migration files | Reconcile duplicate indices and journal; move or document manual scripts |
| Controller error handling | Refactor into shared helper (e.g. `handleControllerError`) |
| Optional: ID param parsing | Add small helper to avoid repeated parseInt/404 logic |
