import { test, expect } from "@playwright/test";
import manifest from "../src/lib/ocr/training/image-manifest.json";
import { RECEIPT_BENCHMARK_RECIPES } from "../src/lib/ocr/ocr-pipeline-presets";
import { TESSERACT_VERSION } from "../src/lib/ocr/tesseract-config";
import type { ImageManifestEntry } from "../src/lib/ocr/training/compare-manifest";
import {
  allManifestFilesPresent,
  runRolePipelineBenchmark,
} from "./ocr-benchmark-helpers";

const allEntries = manifest as ImageManifestEntry[];
const receiptEntries = allEntries.filter((e) => e.role === "receipt");

test.describe("OCR pipeline benchmark — receipts", () => {
  test.describe.configure({ timeout: 900_000 });

  test.beforeAll(() => {
    test.skip(
      !allManifestFilesPresent(allEntries),
      "Fixture images missing — copy JPGs per fixtures/images/README.md"
    );
  });

  test("image variant × PSM × receipt post-OCR", async ({ page }) => {
    expect(receiptEntries.length).toBeGreaterThan(0);
    // eslint-disable-next-line no-console
    console.log(
      `[ocr-rcpt] tesseract ${TESSERACT_VERSION}; ${RECEIPT_BENCHMARK_RECIPES.length} recipes × ${receiptEntries.length} images`
    );
    await runRolePipelineBenchmark(
      page,
      "ocr-rcpt",
      receiptEntries,
      RECEIPT_BENCHMARK_RECIPES
    );
  });
});
