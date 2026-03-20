# OCR image fixtures (Layer B)

Real JPEGs/PNGs live here for **`npm run test:ocr-images`** (Playwright: browser `compressImage` + Tesseract + `parseOcrText`).

**`npm run test:ocr-benchmark-receipts`** — receipt rows only: grid of image preprocessing × Tesseract PSM (auto / single block / sparse) × receipt post-OCR (`|`→`1` near money/litres). **`npm run test:ocr-benchmark-odometer`** — odometer rows only: different PSM set (auto / single line / sparse / raw line) × odometer post-OCR (`O` between digits → `0`). **`npm run test:ocr-benchmark`** runs both. Tune matrices in [`ocr-pipeline-presets.ts`](../../../ocr-pipeline-presets.ts).


## Gitignore vs testing

**`.gitignore` only affects what Git commits.** It does **not** stop Node or Playwright from reading files on your disk.

| Where | JPGs in this folder? | `npm run test:ocr-images` |
|--------|----------------------|---------------------------|
| **Your machine** | You copied them here (ignored by Git) | **Runs** — reads files with `fs.readFileSync` |
| **CI / fresh clone** | Folder empty or incomplete | **Skips** — nothing to read after checkout |

So: keep photos **out of Git**, place them locally under `fixtures/images/` with names matching [`image-manifest.json`](../image-manifest.json), then run the script. No upload required for local testing.

## Workflow

1. Add images using the filenames in `image-manifest.json` (e.g. `Receipt-001.jpg`, `odo-001.jpg`).
2. From repo root: `npm run test:ocr-images` (uses `playwright.config` webServer + `/ocr-harness`).
3. Adjust `critical: true/false` per row in `image-manifest.json` as fixtures stabilize.

## CI

Without committed binaries, Layer B will **skip** in CI. That is intentional. To run in CI later you’d need a private artifact (e.g. encrypted zip, LFS, or internal storage)—not required for local-only validation.
