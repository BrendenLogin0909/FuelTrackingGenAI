import { test, expect } from "@playwright/test";

declare global {
  interface Window {
    __FUEL_OCR_HARNESS__?: {
      run: (
        dataUrl: string,
        opts?: string
      ) => Promise<{
        text: string;
        confidence: number;
        compressMs: number;
        recognizeMs: number;
        tesseractVersion: string;
      }>;
    };
  }
}
import * as fs from "fs";
import * as path from "path";
import manifest from "../src/lib/ocr/training/image-manifest.json";
import { parseOcrText } from "../src/lib/ocr/parser";
import {
  compareExtractedToManifest,
  type ImageManifestEntry,
} from "../src/lib/ocr/training/compare-manifest";
import { TESSERACT_VERSION } from "../src/lib/ocr/tesseract-config";

const FIXTURES_DIR = path.join(
  __dirname,
  "../src/lib/ocr/training/fixtures/images"
);

const entries = manifest as ImageManifestEntry[];

function allFixtureFilesPresent(): boolean {
  return entries.every((e) =>
    fs.existsSync(path.join(FIXTURES_DIR, e.filename))
  );
}

test.describe("Layer B — image OCR harness", () => {
  test.describe.configure({ timeout: 600_000 });

  test.beforeAll(() => {
    test.skip(
      !allFixtureFilesPresent(),
      "Fixture image files missing on disk (e.g. fresh clone or CI without binaries). " +
        "Gitignore does not block local runs: copy JPGs into src/lib/ocr/training/fixtures/images/ " +
        "matching image-manifest.json, then re-run npm run test:ocr-images"
    );
  });

  test("runs browser OCR + parse for each manifest image", async ({ page }) => {
    // eslint-disable-next-line no-console
    console.log(`[ocr-image-harness] tesseract.js / CDN version: ${TESSERACT_VERSION}`);

    await page.goto("/ocr-harness");
    await page.waitForFunction(
      () => typeof window.__FUEL_OCR_HARNESS__ !== "undefined",
      { timeout: 60_000 }
    );

    for (const entry of entries) {
      const filePath = path.join(FIXTURES_DIR, entry.filename);
      const buf = fs.readFileSync(filePath);
      const dataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;

      const ocrResult = await page.evaluate(async (url: string) => {
        const h = window.__FUEL_OCR_HARNESS__;
        if (!h) throw new Error("Harness not mounted");
        return h.run(url);
      }, dataUrl);

      const parsed = parseOcrText(ocrResult.text);
      const mismatches = compareExtractedToManifest(parsed, entry.expected);

      // eslint-disable-next-line no-console
      console.log(
        `[ocr-image-harness] ${entry.id} critical=${entry.critical} conf=${ocrResult.confidence} compressMs=${ocrResult.compressMs} recognizeMs=${ocrResult.recognizeMs} mismatches=${mismatches.length}`
      );

      if (entry.critical) {
        expect(mismatches, entry.id).toEqual([]);
      } else {
        if (mismatches.length > 0) {
          // eslint-disable-next-line no-console
          console.warn(
            `[ocr-image-harness] non-critical ${entry.id}:`,
            mismatches
          );
        }
        expect(ocrResult.text.length, `${entry.id} empty OCR`).toBeGreaterThan(
          10
        );
      }
    }
  });
});
