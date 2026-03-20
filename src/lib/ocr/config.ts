/**
 * Client-side OCR budgets (see docs/ocr-improvement-plan.md).
 * Receipt / odometer use a tuned primary pipeline; when `shouldRetryRole` fires,
 * a **fallback** pipeline runs automatically (still bounded by OCR_TOTAL_TIMEOUT_MS).
 */
export const OCR_PER_PASS_TIMEOUT_MS = 12_000;

/** Budget for full batch (primary + fallback per role when triggered). */
export const OCR_TOTAL_TIMEOUT_MS = 60_000;

/** Below this mean confidence (0–100), retry may run if other triggers did not (tertiary). */
export const OCR_LOW_CONFIDENCE_THRESHOLD = 40;
