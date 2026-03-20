# OCR parser training ground (Layer A)

This suite exercises **the parser only** (`parseOcrText` on fixture strings). It does **not** run Tesseract on images.

**Important**: Per `docs/ocr-improvement-plan.md`, **image preprocessing and OCR-input changes** (Tier 4+) also require **Layer B** — an image → OCR → parse regression suite. Layer A alone cannot prove real-world OCR improved.

## Run

```bash
npm run test:ocr-training
```

## What it does

- Loads `parser-cases.json`.
- For each case: `parseOcrText(ocrText)` vs `expected` and `mustNotHave`.
- Computes a **per-case score** (fraction of constraints satisfied).
- Logs **mean score**, **min score**, and **A/B** when `alternateOcrText` is set.
- Fails if any case scores below 1 (full pass).

## Adding cases

1. Copy an existing JSON object; set a unique `id`.
2. Put representative **OCR text** (paste from real runs when possible).
3. List only fields you care about in `expected`; omit the rest.
4. Use `mustNotHave: ["odometer"]` (etc.) to guard false positives.
5. **A/B preprocessing**: after you run a second pipeline on the same image, paste output into `alternateOcrText`. The test output prints primary vs alternate mean scores so you can pick the winner without merging blind.

## Files

| File | Purpose |
|------|---------|
| `parser-cases.json` | Ground truth for parser + optional OCR variant B |
| `critical-cases.json` | `parserCaseIdsOptional`: parser case IDs allowed to score &lt; 1 (warning only). `layerBCriticalImageIds`: doc only (Layer B uses `critical` on each row of `image-manifest.json`). |
| `image-manifest.json` | Layer B: fixture filenames + expected fields + `critical` flag per image |
| `evaluate.ts` | Scoring helpers (usable from scripts later) |
| `types.ts` | Case typings |

## Layer B (real OCR)

```bash
npm run test:ocr-images
```

Requires JPEG fixtures under `fixtures/images/` (often gitignored). Critical images must match expected fields; non-critical rows log warnings only.
