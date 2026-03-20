import type { Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import type { ImageManifestEntry } from "../src/lib/ocr/training/compare-manifest";
import { manifestMatchScore } from "../src/lib/ocr/training/compare-manifest";
import { parseOcrText } from "../src/lib/ocr/parser";
import { applyOcrPostProcess } from "../src/lib/ocr/ocr-postprocess";
import type { OcrHarnessRecipe } from "../src/lib/ocr/ocr-pipeline-presets";

const FIXTURES_DIR = path.join(
  __dirname,
  "../src/lib/ocr/training/fixtures/images"
);

export type VariantAgg = {
  passSum: number;
  fieldSum: number;
  criticalPassSum: number;
  criticalFieldSum: number;
  compressMsSum: number;
  recognizeMsSum: number;
  runs: number;
};

export function fixturesDir(): string {
  return FIXTURES_DIR;
}

export function allManifestFilesPresent(entries: ImageManifestEntry[]): boolean {
  return entries.every((e) =>
    fs.existsSync(path.join(FIXTURES_DIR, e.filename))
  );
}

function harnessOptsPayload(recipe: OcrHarnessRecipe): string {
  return JSON.stringify({
    variant: recipe.imageVariant,
    psm: recipe.psm,
  });
}

export async function runRolePipelineBenchmark(
  page: Page,
  label: string,
  entries: ImageManifestEntry[],
  recipes: OcrHarnessRecipe[]
): Promise<void> {
  await page.goto("/ocr-harness");
  await page.waitForFunction(
    () => typeof window.__FUEL_OCR_HARNESS__ !== "undefined",
    { timeout: 60_000 }
  );

  const byRecipe: Record<string, VariantAgg> = {};
  for (const r of recipes) {
    byRecipe[r.id] = {
      passSum: 0,
      fieldSum: 0,
      criticalPassSum: 0,
      criticalFieldSum: 0,
      compressMsSum: 0,
      recognizeMsSum: 0,
      runs: 0,
    };
  }

  const perImageBest: {
    id: string;
    bestRecipeId: string;
    pass: number;
    total: number;
  }[] = [];

  for (const entry of entries) {
    const filePath = path.join(FIXTURES_DIR, entry.filename);
    const buf = fs.readFileSync(filePath);
    const dataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;

    let bestRecipeId = recipes[0].id;
    let bestPass = -1;
    let bestTotal = 0;

    for (const recipe of recipes) {
      const payload = harnessOptsPayload(recipe);
      const ocrResult = await page.evaluate(
        async ([url, jsonOpts]: [string, string]) => {
          const h = window.__FUEL_OCR_HARNESS__;
          if (!h) throw new Error("Harness not mounted");
          return h.run(url, jsonOpts);
        },
        [dataUrl, payload] as [string, string]
      );

      const text = applyOcrPostProcess(ocrResult.text, recipe.postProcess);
      const parsed = parseOcrText(text);
      const { pass, total, mismatches } = manifestMatchScore(
        parsed,
        entry.expected
      );

      const agg = byRecipe[recipe.id];
      agg.passSum += pass;
      agg.fieldSum += total;
      agg.compressMsSum += ocrResult.compressMs;
      agg.recognizeMsSum += ocrResult.recognizeMs;
      agg.runs += 1;
      if (entry.critical) {
        agg.criticalPassSum += pass;
        agg.criticalFieldSum += total;
      }

      if (pass > bestPass) {
        bestPass = pass;
        bestTotal = total;
        bestRecipeId = recipe.id;
      }

      // eslint-disable-next-line no-console
      console.log(
        `[${label}] ${entry.id} recipe=${recipe.id} pass=${pass}/${total} critical=${entry.critical} conf=${ocrResult.confidence.toFixed(0)} mismatches=${mismatches.length}`
      );
    }

    perImageBest.push({
      id: entry.id,
      bestRecipeId,
      pass: bestPass,
      total: bestTotal,
    });
  }

  const rows = recipes.map((r) => {
    const a = byRecipe[r.id];
    return {
      id: r.id,
      passSum: a.passSum,
      fieldSum: a.fieldSum,
      pct: a.fieldSum ? ((a.passSum / a.fieldSum) * 100).toFixed(1) : "0",
      critPass: a.criticalPassSum,
      critField: a.criticalFieldSum,
      critPct: a.criticalFieldSum
        ? ((a.criticalPassSum / a.criticalFieldSum) * 100).toFixed(1)
        : "—",
      avgCompress: (a.compressMsSum / a.runs).toFixed(0),
      avgRecognize: (a.recognizeMsSum / a.runs).toFixed(0),
    };
  });

  rows.sort((x, y) => y.passSum - x.passSum || y.critPass - x.critPass);

  // eslint-disable-next-line no-console
  console.log(`\n[${label}] === aggregate (higher passSum wins) ===`);
  for (const r of rows) {
    // eslint-disable-next-line no-console
    console.log(
      `[${label}] ${r.id}: fields_matched=${r.passSum}/${r.fieldSum} (${r.pct}%) critical=${r.critPass}/${r.critField} (${r.critPct}%) avgMs compress=${r.avgCompress} recognize=${r.avgRecognize}`
    );
  }

  // eslint-disable-next-line no-console
  console.log(`\n[${label}] === per-image best recipe ===`);
  for (const p of perImageBest) {
    // eslint-disable-next-line no-console
    console.log(
      `[${label}] ${p.id}: ${p.bestRecipeId} (${p.pass}/${p.total})`
    );
  }

  const winner = rows[0]?.id ?? recipes[0].id;
  // eslint-disable-next-line no-console
  console.log(`\n[${label}] suggested recipe (by total field matches): ${winner}`);
}
