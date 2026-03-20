/** Pinned with package.json tesseract.js — keep in sync for reproducible OCR. */
export const TESSERACT_VERSION = "5.1.1";

export const TESSERACT_CDN = {
  workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`,
  corePath: `https://cdn.jsdelivr.net/npm/tesseract.js-core@${TESSERACT_VERSION}/`,
} as const;
