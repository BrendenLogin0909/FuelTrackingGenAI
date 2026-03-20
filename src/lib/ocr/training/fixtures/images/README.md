# OCR image fixtures (optional)

Use this folder for **real receipt/odometer photos** when you want end-to-end checks.

## Workflow

1. Add `*.jpg` / `png` (keep files small; no personal data in shared repos unless policy allows).
2. Run Tesseract locally once (browser or Node) and save the **raw OCR text** to `golden/<case-id>.txt`.
3. Add a row to `image-manifest.json` (see schema below).
4. Optional: enable `RUN_OCR_IMAGE_BENCH=1` in a dedicated test once worker paths work in your CI.

## Why golden text first

CI stays fast and stable: tests assert `parseOcrText(goldenText)` against expected fields. When you change **preprocessing** or **Tesseract settings**, regenerate golden files and inspect diffs to see if the pipeline helped or hurt.

## `image-manifest.json` (planned)

```json
[
  {
    "id": "sample-receipt-001",
    "role": "receipt",
    "imageFile": "receipt-001.jpg",
    "goldenTextFile": "golden/sample-receipt-001.txt",
    "expected": { "total_cost": 0 }
  }
]
```

Populate `expected` with values you verified manually from the receipt. Until manifests exist, image-based tests remain skipped.
