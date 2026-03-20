# OCR improvement plan (tiered, rollback-safe)

**Constraints**: no mixing OCR with unrelated UI work, small commits, measure before keeping, rollback-friendly toggles.

---

## Principles

1. **Two acceptance surfaces, both mandatory** — Layer A (parser text fixtures) is fast CI and necessary for parser changes. Layer B (real image → Tesseract → parse → compare) is **the merge gate** for any change that touches the OCR input path: preprocessing, retry, encode/resize, engine version. Layer A alone cannot prove a preprocessing change helped; Layer B alone cannot prove a parser change is safe. Both must pass.

2. **Layer B must run real OCR at merge time** — Golden-text snapshots are useful for fast CI, but they are **not sufficient** as the merge gate for Tier 2+. If a preprocessing change is in the PR, the CI or pre-merge job must run image → OCR → parse on at least the critical fixture set. "Regenerate goldens later" is not a gate; it is housekeeping.

3. **Layer B must mirror the production browser path** — Production OCR goes through `compressImage` (canvas resize + JPEG re-encode at 0.8 quality) before Tesseract. A Node-only harness that feeds raw pixels to the worker tests a **different pipeline**. Layer B should use Playwright (or browser-environment Jest) so that the same `Image` → canvas → `toDataURL` → `worker.recognize` path is exercised. If that is impractical short-term, document the gap explicitly and treat Node-harness results as **approximate**.

4. **Parser behaviour can hide OCR failure** — If the parser fills plausible values (default date = today, station = first line), the first pass looks "complete" and retry never fires. Neutralize these defaults **before** trusting retry or preprocess metrics.

5. **Baseline honesty** — The current single-pass path already applies lossy resize + JPEG re-encode (`compressImage` in `index.ts`). It is the rollback-safe default, but not necessarily optimal. The plan must allow baseline-B experiments on encode/resize (separate flag/commit) rather than only tuning on top of a potentially bad control.

6. **Per-case / per-class no-regression, not only mean score** — Mean improvement can mask regression on business-critical cases. Ship requires every case in the **critical manifest** to pass or match baseline, not just aggregate improvement.

7. **Pin OCR engine versions** — `package.json` declares `tesseract.js: ^5.0.4` but production loads worker `5.1.1` and core `5.1.1` from CDN. Version drift invalidates A/B results. Pin and record all four versions (package, worker, core, lang-data) in benchmark output. Resolve the existing mismatch before running experiments.

8. **Tesseract confidence is a secondary signal** — Mean OCR confidence does not correlate reliably with the specific fields the business cares about. Use it for telemetry and as a **tiebreaker**, but field-level plausibility and missing-field checks are the primary retry triggers.

---

## Rollback plan

1. **Branch**: `feat/ocr-<slice>` — one slice per branch.

2. **Feature flags — decision required before implementation**:

| Mechanism | Flip without deploy? | Notes |
|-----------|----------------------|--------|
| Runtime config / API | **Yes** | Best for instant "stop retries." |
| Server-only env (not `NEXT_PUBLIC_`) | Redeploy (unless read dynamically per request) | Avoid static inlining for hot toggles. |
| `NEXT_PUBLIC_` / compiled constant | **No** — requires new build + deploy | Acceptable if team agrees redeploy rollback is fast enough. |

**Decision**: State which mechanism the project requires for production **before** implementing Tier 2. If redeploy-based rollback (~minutes) is acceptable, `NEXT_PUBLIC_` is fine. If same-build rollback (~seconds) is needed, invest in runtime config.

3. **Commits** (each independently revertible):
   - Tier 0: logging  
   - Tier 1: parser neutralization / hardening  
   - Tier 1b: Layer B image harness (before any retry or preprocess change)  
   - Tier 2: per-role pipeline + fallback retry (see `ocr-pipeline-production.ts`)  
   - Tier 3+: one preprocessing experiment per commit (flagged)

---

## Acceptance model

| Layer | What it exercises | When required |
|--------|------------------|---------------|
| **A — Parser training ground** | `parseOcrText` on strings in `parser-cases.json` | Every OCR-related PR. |
| **B — Image OCR suite** | Real images → production-equivalent Tesseract path → parse → compare to golden fields | **Merge gate** for any PR that changes OCR input, preprocessing, retry, encode/resize, or engine version. Must run actual OCR, not only parse-on-golden-text. |

### Critical case manifest

Maintain an explicit list of **critical case IDs** (e.g. `receipt-001`, `odo-001`) in `src/lib/ocr/training/critical-cases.json` or as a `critical: true` flag in `image-manifest.json`. These are owned by the product owner / BA. The production gate rule is:

> **No critical case may regress** from baseline when shipping any OCR change — even if mean score improves.

### Layer B implementation

**Preferred**: Playwright test that opens a minimal page, loads each fixture image through the same `compressImage` + Tesseract path as production, parses, and asserts.

**Acceptable short-term**: Node-based harness with `canvas` (npm) + Tesseract Node worker — but document that it does **not** match the browser canvas/JPEG path exactly, and treat results as approximate for preprocessing experiments.

---

## Multi-image pipeline and UI

Receipt and odometer are **separate roles**. The pipeline should:

- **Score per role** after each image's first pass (receipt: money/station/date/fuel; odometer: odo/trip).
- **Retry only the failing role** — do not re-OCR a satisfied image.
- **Update UI at each stage**:
  - Preparing images…
  - Reading receipt…
  - Reading odometer…
  - Retrying receipt… / Retrying odometer… (only if that role failed)
  - Checking values…

Keep UI messaging changes in **OCR-only commits** (no dashboard mix).

---

## Timeouts and resource budgets

Define **concrete thresholds** before enabling retries:

| Budget | Target | Rationale |
|--------|--------|-----------|
| **Total wall-clock** per transaction (all images + retries) | **30 s** | UX ceiling on mobile; after this, show partial results + manual entry. |
| **Per-pass cap** (single `worker.recognize`) | **12 s** | Fail soft → skip retry or show timeout message. |
| **Max retries per role** | **1** | Limits worst case to 2× single-pass time per image. |
| **Max image dimension** before OCR | **2000 px** (current) | Document; revisit in Tier 5/6 baseline-B experiments. |
| **Worker lifecycle** | Terminate on timeout or error | Prevent stuck workers on large/corrupt images. |

These are starting values. Adjust based on real device telemetry from Tier 0 logging.

---

## OCR engine version pinning

**Current state** (mismatch):
- `package.json`: `tesseract.js: ^5.0.4` (semver range)
- `index.ts` CDN URLs: worker `5.1.1`, core `5.1.1`

**Required before experiments**:
1. Pin `package.json` to exact version matching the CDN worker/core (e.g. `"tesseract.js": "5.1.1"`).
2. Record in Layer B output: `tesseract.js`, worker, core, lang-data versions.
3. When upgrading Tesseract: treat as its own experiment, re-run Layer B, compare.

---

## Tier 0 — Instrumentation (no behaviour change)

- Structured logs: role, text length, Tesseract confidence (secondary / telemetry), per-field presence, per-pass timing, retry reason codes.
- Layer A green.

**Exit criteria**: Logs answer "why retry / why not" and "how long did each pass take" for each image.

---

## Tier 1 — Parser neutralization & hardening + Layer B harness

**Sequenced before** retry and preprocessing so that metrics are trustworthy.

### 1a — Parser neutralization

- Remove or gate behaviors that fabricate plausible output from weak OCR:
  - **Date defaults to today** when no date found → return `undefined` instead; surface as "needs review" (see confidence contract below).
  - **Station = first line** without strong keyword match → return `undefined` instead.
- Add plausibility validators: total/litres/PPL consistency, odometer range, trip vs odo sanity.
- Update `parser-cases.json` for every change.

### 1b — Layer B image harness

- Build before Tier 2, not after — retry changes are user-visible OCR behavior, not just parser behavior.
- Minimum fixture set: images provided by product owner (see `Project Management/Test Data/OCR Test Images.md`).
- Preferred: Playwright-based to mirror production browser path.
- Wire into CI or pre-merge script.

### Confidence contract (downstream behaviour for "needs review")

When a field is missing or low-confidence after OCR + parse:

| State | Stored value | UI behaviour | Can submit? |
|-------|-------------|--------------|-------------|
| **Field extracted, plausible** | Populated in form | Pre-filled, editable | Yes |
| **Field missing / implausible** | Empty | Highlighted as "needs review"; manual entry | Yes (user confirms or fills) |
| **OCR failed entirely** | Empty | All fields empty, message shown | Yes (full manual entry) |

Key point: the transaction is **always submittable** — OCR is a convenience, not a gate. "Needs review" is a UI signal, not a blocker. No separate "confidence" field is stored on the transaction; confidence is a transient pipeline signal that drives retry decisions and UI hints during the add flow only.

**Exit criteria**: Layer A green; Layer B harness exists and passes on baseline; false-success paths (date/station defaults) removed or flagged; confidence contract agreed.

---

## Tier 2 — Retry framework (implemented)

**Production** (`extractFromImages`): each role runs a **tuned primary** pipeline, then a **different fallback** pipeline when `shouldRetryRole` fires (missing required fields, receipt plausibility, low confidence), bounded by `OCR_TOTAL_TIMEOUT_MS`. Pipelines are defined in `src/lib/ocr/ocr-pipeline-production.ts` (receipt: jpegHigh+PSM6+receipt post → baseline+PSM6+receipt; odometer: grayscaleContrastJpegHigh+PSM11 → baseline+PSM3).

**Retry triggers** (configurable; add one per commit):

| Priority | Trigger | Notes |
|----------|---------|-------|
| **Primary** | Required field missing for role | Trustworthy after Tier 1 neutralization. |
| **Primary** | Parser plausibility failure (e.g. litres × PPL vs total beyond tolerance; odometer out of range) | Catches wrong-but-present values. |
| **Secondary** | Ambiguity — multiple competing money lines, no stable winner | Receipt-specific. |
| **Tertiary** | Low Tesseract mean confidence below threshold | Tiebreaker only; do not rely on as primary trigger. |

**Not in this tier**: auto-crop, rotation, threshold, sharpen.

**Exit criteria**: bounded per-role fallback + timeouts respected; Layer A + Layer B green.

---

## Tier 3 — One minimal preprocessing experiment (flagged)

- First experiment only: e.g. grayscale + mild contrast on in-memory canvas copy; saved asset unchanged.
- **Measure**: Layer A (`alternateOcrText`) **and** Layer B (same images through new pipeline).
- **Keep** only if:
  - Aggregate improves or matches, **and**
  - **No critical-manifest case regresses** from baseline.

**Exit criteria**: Before/after table from Layer A and Layer B; critical-case table signed off.

---

## Tier 4 — Additional preprocessing (one at a time)

Same gates as Tier 3. Candidates: resize policy, denoise, different JPEG quality for OCR-only bitmap — not all at once.

**Forbidden in one commit**: auto-crop, multi-rotation search, threshold, sharpen.

---

## Tier 5 — Baseline-B (encode / resize path)

Separate flag from "retry preprocess." Experiments on the `compressImage` path itself: PNG to worker, different max dimension, different JPEG quality. Compare using Layer B; same critical-case no-regression rules.

**Role-split tuning (local)**: `npm run test:ocr-benchmark-receipts` and `npm run test:ocr-benchmark-odometer` sweep different Tesseract PSM sets and post-OCR text modes per `image-manifest.json` role; matrices live in `src/lib/ocr/ocr-pipeline-presets.ts`. Production still uses a single path until a winning recipe is wired per role.

---

## Tier 6 — Optional server fallback

Behind a flag; only after local budgets exhausted and policy allows.

### Privacy and policy requirements (define now, not later)

Before any server-side OCR is architecturally approved:

- **Image transit**: May receipt/odometer images leave the device? Over what transport (TLS, specific endpoints)?
- **Retention**: How long may the server store images? Must they be deleted immediately after OCR?
- **Consent**: Does the user need to opt in per-image, per-session, or once?
- **Audit**: Is there a logging/audit requirement for images sent to a server?
- **Scope**: Which roles may be sent (receipt only? odometer only? both)?

These constraints affect architecture (e.g. edge function vs persistent server, ephemeral processing, consent UI) and should be settled before implementation begins.

---

## Production gate summary

| Check | Requirement |
|--------|-------------|
| Layer A | All `parser-cases.json` cases score 1. |
| Layer B (real OCR) | All image fixtures pass field expectations via actual Tesseract run. |
| Critical manifest | **No regression** on any critical case vs baseline. |
| `mustNotHave` | No violations. |
| Alternates | Mean improvement alone insufficient — critical subset must not regress. |
| Engine versions | Pinned and recorded in output. |
| Budgets | Total wall-clock and per-pass within thresholds. |

---

## Checklist for the next change

- [ ] OCR-only diff (no unrelated UI/dashboard/report in same commit)
- [ ] Flag mechanism decided: runtime vs redeploy
- [ ] OCR engine versions pinned and mismatch resolved
- [ ] Parser neutralization (Tier 1a) before trusting preprocess metrics
- [ ] Layer B harness exists (Tier 1b) before any retry or preprocess merge
- [ ] Retry triggers include plausibility failures, not only missing fields
- [ ] Timeouts and per-role retry caps defined with concrete values
- [ ] Confidence contract: "needs review" is UI-only, transaction always submittable
- [ ] Layer A + Layer B both pass; critical manifest cases do not regress
- [ ] Multi-image: retry scoped per role; UI stages updated if flow changes
- [ ] Privacy/policy requirements documented if server fallback is in scope
