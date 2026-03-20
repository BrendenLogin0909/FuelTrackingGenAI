"use client";

import { useEffect } from "react";
import type Tesseract from "tesseract.js";
import {
  compressImage,
  type OcrImageVariant,
} from "@/lib/ocr/compress-image";
import { TESSERACT_CDN, TESSERACT_VERSION } from "@/lib/ocr/tesseract-config";

export type OcrHarnessRunResult = {
  text: string;
  confidence: number;
  compressMs: number;
  recognizeMs: number;
  tesseractVersion: string;
};

/** Second arg: legacy image variant string, or JSON `{ "variant", "psm" }` (psm = tessedit_pageseg_mode). */
function parseHarnessRunOpts(opts?: string): {
  variant: OcrImageVariant;
  psm: string;
} {
  let variant: OcrImageVariant = "baseline";
  let psm = "3";
  if (!opts) return { variant, psm };
  const t = opts.trimStart();
  if (t.startsWith("{")) {
    const o = JSON.parse(opts) as { variant?: string; psm?: string | number };
    if (o.variant) variant = o.variant as OcrImageVariant;
    if (o.psm != null) psm = String(o.psm);
  } else {
    variant = opts as OcrImageVariant;
  }
  return { variant, psm };
}

declare global {
  interface Window {
    __FUEL_OCR_HARNESS__?: {
      run: (dataUrl: string, opts?: string) => Promise<OcrHarnessRunResult>;
    };
  }
}

export default function OcrHarnessPage() {
  useEffect(() => {
    window.__FUEL_OCR_HARNESS__ = {
      run: async (dataUrl: string, opts?: string) => {
        const { variant, psm } = parseHarnessRunOpts(opts);
        const t0 = performance.now();
        const compressed = await compressImage(dataUrl, undefined, {
          variant,
        });
        const t1 = performance.now();
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng", 1, {
          workerPath: TESSERACT_CDN.workerPath,
          corePath: TESSERACT_CDN.corePath,
        });
        try {
          await worker.setParameters({
            tessedit_pageseg_mode: psm as Tesseract.PSM,
          });
          const r = await worker.recognize(compressed);
          const t2 = performance.now();
          const conf =
            typeof r.data.confidence === "number" && !Number.isNaN(r.data.confidence)
              ? r.data.confidence
              : 0;
          return {
            text: r.data.text ?? "",
            confidence: Math.round(conf * 100) / 100,
            compressMs: Math.round(t1 - t0),
            recognizeMs: Math.round(t2 - t1),
            tesseractVersion: TESSERACT_VERSION,
          };
        } finally {
          await worker.terminate();
        }
      },
    };
    return () => {
      delete window.__FUEL_OCR_HARNESS__;
    };
  }, []);

  return (
    <div className="p-6 text-sm text-muted-foreground">
      OCR harness (dev/test). Playwright calls{" "}
      <code>window.__FUEL_OCR_HARNESS__.run(dataUrl)</code> or{" "}
      <code>run(dataUrl, JSON.stringify(&#123; variant, psm &#125;))</code>.
    </div>
  );
}
