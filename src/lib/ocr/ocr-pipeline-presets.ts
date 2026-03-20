/**
 * Benchmark / tuning recipes: image preprocessing × Tesseract PSM × post-OCR text.
 * Receipts (paper) vs odometer (displays) use different PSM and postprocess sets.
 */

import { OCR_IMAGE_VARIANTS, type OcrImageVariant } from "./compress-image";
import type { OcrPostProcessMode } from "./ocr-postprocess";

export type OcrHarnessRecipe = {
  id: string;
  imageVariant: OcrImageVariant;
  /** tessedit_pageseg_mode (string enum value, e.g. "3", "7") */
  psm: string;
  postProcess: OcrPostProcessMode;
};

/** Tesseract 5 PSM string values (see tesseract.js PSM enum). */
export const TESSERACT_PSM = {
  AUTO: "3",
  SINGLE_BLOCK: "6",
  SPARSE_TEXT: "11",
  SINGLE_LINE: "7",
  RAW_LINE: "13",
} as const;

function buildRecipes(
  prefix: string,
  psmList: readonly string[],
  postModes: readonly OcrPostProcessMode[]
): OcrHarnessRecipe[] {
  const out: OcrHarnessRecipe[] = [];
  for (const imageVariant of OCR_IMAGE_VARIANTS) {
    for (const psm of psmList) {
      for (const postProcess of postModes) {
        out.push({
          id: `${prefix}-${imageVariant}-psm${psm}-${postProcess}`,
          imageVariant,
          psm,
          postProcess,
        });
      }
    }
  }
  return out;
}

/** Paper receipts: block / sparse layouts + receipt-oriented text fixes. */
export const RECEIPT_BENCHMARK_RECIPES = buildRecipes(
  "rcpt",
  [TESSERACT_PSM.AUTO, TESSERACT_PSM.SINGLE_BLOCK, TESSERACT_PSM.SPARSE_TEXT],
  ["none", "receipt"]
);

/** Dash / trip displays: line-oriented PSM + O→0 between digits. */
export const ODOMETER_BENCHMARK_RECIPES = buildRecipes(
  "odo",
  [
    TESSERACT_PSM.AUTO,
    TESSERACT_PSM.SINGLE_LINE,
    TESSERACT_PSM.SPARSE_TEXT,
    TESSERACT_PSM.RAW_LINE,
  ],
  ["none", "odometer"]
);
