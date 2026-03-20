/**
 * Browser OCR pipelines tuned from `npm run test:ocr-benchmark-*`.
 * Primary = best aggregate; fallback = same PSM family where noted, else baseline/PSM3.
 */

import type { OcrImageVariant } from "./compress-image";
import type { OcrPostProcessMode } from "./ocr-postprocess";

export type OcrRecognizePipeline = {
  /** For structured logging */
  label: string;
  imageVariant: OcrImageVariant;
  /** tessedit_pageseg_mode value (string), e.g. "6", "11" */
  psm: string;
  postProcess: OcrPostProcessMode;
};

/** jpegHigh + single block + receipt post-OCR; then baseline + single block if retry. */
export const RECEIPT_OCR_PIPELINES: readonly OcrRecognizePipeline[] = [
  {
    label: "receipt_jpegHigh_psm6_receipt",
    imageVariant: "jpegHigh",
    psm: "6",
    postProcess: "receipt",
  },
  {
    label: "receipt_baseline_psm6_receipt",
    imageVariant: "baseline",
    psm: "6",
    postProcess: "receipt",
  },
];

/** grayscaleContrastJpegHigh + sparse; then baseline auto page. */
export const ODOMETER_OCR_PIPELINES: readonly OcrRecognizePipeline[] = [
  {
    label: "odo_grayscaleContrastJpegHigh_psm11",
    imageVariant: "grayscaleContrastJpegHigh",
    psm: "11",
    postProcess: "none",
  },
  {
    label: "odo_baseline_psm3",
    imageVariant: "baseline",
    psm: "3",
    postProcess: "none",
  },
];

export const DEFAULT_OCR_PIPELINE: OcrRecognizePipeline = {
  label: "default_baseline_psm3",
  imageVariant: "baseline",
  psm: "3",
  postProcess: "none",
};
