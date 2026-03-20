import { test, expect } from "@playwright/test";
import manifest from "../src/lib/ocr/training/image-manifest.json";
import { ODOMETER_BENCHMARK_RECIPES } from "../src/lib/ocr/ocr-pipeline-presets";
import { TESSERACT_VERSION } from "../src/lib/ocr/tesseract-config";
import type { ImageManifestEntry } from "../src/lib/ocr/training/compare-manifest";
import {
  allManifestFilesPresent,
  runRolePipelineBenchmark,
} from "./ocr-benchmark-helpers";

const allEntries = manifest as ImageManifestEntry[];
const odoEntries = allEntries.filter((e) => e.role === "odometer");

test.describe("OCR pipeline benchmark — odometer", () => {
  test.describe.configure({ timeout: 900_000 });

  test.beforeAll(() => {
    test.skip(
      !allManifestFilesPresent(allEntries),
      "Fixture images missing — copy JPGs per fixtures/images/README.md"
    );
  });

  test("image variant × PSM × odometer post-OCR", async ({ page }) => {
    expect(odoEntries.length).toBeGreaterThan(0);
    // eslint-disable-next-line no-console
    console.log(
      `[ocr-odo] tesseract ${TESSERACT_VERSION}; ${ODOMETER_BENCHMARK_RECIPES.length} recipes × ${odoEntries.length} images`
    );
    await runRolePipelineBenchmark(
      page,
      "ocr-odo",
      odoEntries,
      ODOMETER_BENCHMARK_RECIPES
    );
  });
});
