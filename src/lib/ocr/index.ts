import type Tesseract from "tesseract.js";
import { compressImage } from "./compress-image";
import {
  OCR_PER_PASS_TIMEOUT_MS,
  OCR_TOTAL_TIMEOUT_MS,
} from "./config";
import { applyOcrPostProcess } from "./ocr-postprocess";
import {
  DEFAULT_OCR_PIPELINE,
  ODOMETER_OCR_PIPELINES,
  RECEIPT_OCR_PIPELINES,
  type OcrRecognizePipeline,
} from "./ocr-pipeline-production";
import { parseOcrText } from "./parser";
import { shouldRetryRole, type OcrPassResult } from "./retry";
import { TESSERACT_CDN } from "./tesseract-config";
import type { ExtractFromImagesOptions, OcrProgressStage } from "./types-ocr";
import type {
  ExtractedFields,
  TransactionImageRole,
  TransactionImageSource,
} from "../types/transaction";

export { TESSERACT_CDN, TESSERACT_VERSION } from "./tesseract-config";
export { compressImage } from "./compress-image";
export type { OcrProgressStage, ExtractFromImagesOptions } from "./types-ocr";

type TesseractWorker = Awaited<ReturnType<typeof import("tesseract.js").createWorker>>;

function imageSourceKind(
  source: string | File | Blob
): "dataUrl" | "file" | "blob" {
  if (typeof source === "string") return "dataUrl";
  if (typeof File !== "undefined" && source instanceof File) return "file";
  return "blob";
}

function logOcrPass(payload: Record<string, unknown>): void {
  if (typeof console !== "undefined" && console.debug) {
    console.debug("[ocr]", payload);
  }
}

function populatedFieldKeys(fields: ExtractedFields): string[] {
  return (Object.keys(fields) as (keyof ExtractedFields)[]).filter(
    (k) => fields[k] !== undefined
  ) as string[];
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

async function loadDataUrl(imageSource: string | File | Blob): Promise<string> {
  if (typeof imageSource === "string") return imageSource;
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsDataURL(imageSource as Blob);
  });
}

async function recognizeImageWithWorker(
  worker: TesseractWorker,
  imageSource: string | File | Blob,
  meta: { role?: TransactionImageRole; pipeline?: OcrRecognizePipeline },
  timeoutMs: number
): Promise<{ text: string; confidence: number; recognizeMs: number }> {
  const pipeline = meta.pipeline ?? DEFAULT_OCR_PIPELINE;
  const src = await loadDataUrl(imageSource);
  const t0 = nowMs();
  const compressed = await compressImage(src, undefined, {
    variant: pipeline.imageVariant,
  });
  const t1 = nowMs();

  let rawText = "";
  let confidence = 0;
  let recognizeMs = 0;
  const tRec0 = nowMs();
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: pipeline.psm as Tesseract.PSM,
    });
    const result = await Promise.race([
      worker.recognize(compressed),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("ocr_timeout")), timeoutMs)
      ),
    ]);
    recognizeMs = Math.round(nowMs() - tRec0);
    rawText = result.data.text ?? "";
    const c = result.data.confidence;
    confidence =
      typeof c === "number" && !Number.isNaN(c) ? Math.round(c * 100) / 100 : 0;
  } catch (e) {
    recognizeMs = Math.round(nowMs() - tRec0);
    logOcrPass({
      event: "ocr_pass_error",
      role: meta.role ?? "unknown",
      pipeline: pipeline.label,
      imageSource: imageSourceKind(imageSource),
      error: e instanceof Error ? e.message : String(e),
    });
  }

  const text = applyOcrPostProcess(rawText, pipeline.postProcess);

  logOcrPass({
    event: "ocr_pass",
    role: meta.role ?? "unknown",
    pipeline: pipeline.label,
    imageSource: imageSourceKind(imageSource),
    compressMs: Math.round(t1 - t0),
    recognizeMs,
    textLength: text.length,
    confidence,
  });

  return { text, confidence, recognizeMs };
}

function pickReceiptFields(f: ExtractedFields): ExtractedFields {
  return {
    total_cost: f.total_cost,
    litres: f.litres,
    price_per_litre: f.price_per_litre,
    station_name: f.station_name,
    fuel_type: f.fuel_type,
    date: f.date,
  };
}

function pickOdometerFields(f: ExtractedFields): ExtractedFields {
  return {
    odometer: f.odometer,
    trip_meter: f.trip_meter,
  };
}

async function runRoleOcrPasses(
  worker: TesseractWorker,
  role: TransactionImageRole,
  items: TransactionImageSource[],
  pipeline: OcrRecognizePipeline
): Promise<OcrPassResult> {
  const texts: string[] = [];
  let confidenceSum = 0;
  let timingMs = 0;
  for (const item of items) {
    const r = await recognizeImageWithWorker(
      worker,
      item.image,
      { role, pipeline },
      OCR_PER_PASS_TIMEOUT_MS
    );
    if (r.text.trim()) texts.push(r.text);
    confidenceSum += r.confidence;
    timingMs += r.recognizeMs;
  }
  const combined = texts.join("\n\n");
  const n = items.length || 1;
  const avgConfidence = confidenceSum / n;
  const grouped: Partial<Record<TransactionImageRole, string[]>> = {
    receipt: [],
    odometer: [],
    other: [],
  };
  grouped[role] = texts;
  const parsed = parseExtractedTextByRole(grouped);
  const fields =
    role === "receipt"
      ? pickReceiptFields(parsed)
      : role === "odometer"
        ? pickOdometerFields(parsed)
        : {};

  return {
    texts,
    text: combined,
    confidence: avgConfidence,
    fields,
    timingMs,
  };
}

export async function extractTextFromImage(
  imageSource: string | File | Blob
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: TESSERACT_CDN.workerPath,
    corePath: TESSERACT_CDN.corePath,
  });
  try {
    const { text } = await recognizeImageWithWorker(
      worker,
      imageSource,
      { pipeline: DEFAULT_OCR_PIPELINE },
      OCR_PER_PASS_TIMEOUT_MS
    );
    return text;
  } finally {
    await worker.terminate();
  }
}

export async function extractFromImages(
  images: TransactionImageSource[] | (string | File | Blob)[],
  options?: ExtractFromImagesOptions
): Promise<ExtractedFields> {
  const onProgress = options?.onProgress;

  const groupedText: Record<TransactionImageRole, string[]> = {
    receipt: [],
    odometer: [],
    other: [],
  };

  const normalized = normalizeImageSources(images);
  if (normalized.length === 0) {
    onProgress?.("parsing");
    return parseExtractedTextByRole(groupedText);
  }

  const batchT0 = nowMs();
  const rolesPresent = Array.from(new Set(normalized.map((i) => i.role)));

  const receiptItems = normalized.filter((i) => i.role === "receipt");
  const odometerItems = normalized.filter((i) => i.role === "odometer");
  const otherItems = normalized.filter((i) => i.role === "other");

  onProgress?.("preparing");

  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: TESSERACT_CDN.workerPath,
    corePath: TESSERACT_CDN.corePath,
  });

  const mergeIntoGrouped = (
    role: TransactionImageRole,
    pass: OcrPassResult
  ) => {
    groupedText[role] = pass.texts.map((t) => t.trim()).filter(Boolean);
  };

  try {
    let elapsed = nowMs() - batchT0;

    if (receiptItems.length > 0) {
      onProgress?.("ocr-receipt");
      let pass = await runRoleOcrPasses(
        worker,
        "receipt",
        receiptItems,
        RECEIPT_OCR_PIPELINES[0]
      );
      mergeIntoGrouped("receipt", pass);
      elapsed = nowMs() - batchT0;
      if (elapsed < OCR_TOTAL_TIMEOUT_MS) {
        const retryR = shouldRetryRole("receipt", pass);
        logOcrPass({
          event: "ocr_retry_decision",
          role: "receipt",
          retry: retryR.retry,
          reason: retryR.reason,
        });
        if (retryR.retry) {
          onProgress?.("retry-receipt");
          pass = await runRoleOcrPasses(
            worker,
            "receipt",
            receiptItems,
            RECEIPT_OCR_PIPELINES[1]
          );
          mergeIntoGrouped("receipt", pass);
        }
      }
    }

    if (odometerItems.length > 0) {
      onProgress?.("ocr-odometer");
      let pass = await runRoleOcrPasses(
        worker,
        "odometer",
        odometerItems,
        ODOMETER_OCR_PIPELINES[0]
      );
      mergeIntoGrouped("odometer", pass);
      elapsed = nowMs() - batchT0;
      if (elapsed < OCR_TOTAL_TIMEOUT_MS) {
        const retryO = shouldRetryRole("odometer", pass);
        logOcrPass({
          event: "ocr_retry_decision",
          role: "odometer",
          retry: retryO.retry,
          reason: retryO.reason,
        });
        if (retryO.retry) {
          onProgress?.("retry-odometer");
          pass = await runRoleOcrPasses(
            worker,
            "odometer",
            odometerItems,
            ODOMETER_OCR_PIPELINES[1]
          );
          mergeIntoGrouped("odometer", pass);
        }
      }
    }

    for (const item of otherItems) {
      const r = await recognizeImageWithWorker(
        worker,
        item.image,
        { role: "other", pipeline: DEFAULT_OCR_PIPELINE },
        OCR_PER_PASS_TIMEOUT_MS
      );
      if (r.text.trim()) groupedText.other.push(r.text);
    }

    onProgress?.("parsing");
  } finally {
    await worker.terminate();
  }

  const merged = parseExtractedTextByRole(groupedText);
  const batchT1 = nowMs();
  logOcrPass({
    event: "ocr_batch_complete",
    imageCount: normalized.length,
    rolesPresent,
    totalMs: Math.round(batchT1 - batchT0),
    populatedFields: populatedFieldKeys(merged),
    missingFields: (
      [
        "total_cost",
        "litres",
        "price_per_litre",
        "station_name",
        "fuel_type",
        "date",
        "odometer",
        "trip_meter",
      ] as const
    ).filter((k) => merged[k] === undefined),
  });

  return merged;
}

export function parseExtractedTextByRole(
  groupedText: Partial<Record<TransactionImageRole, string[]>>
): ExtractedFields {
  const receiptText = (groupedText.receipt ?? []).join("\n\n");
  const odometerText = (groupedText.odometer ?? []).join("\n\n");

  const receiptFields = receiptText ? parseOcrText(receiptText) : {};
  const odometerFields = odometerText ? parseOcrText(odometerText) : {};

  return {
    total_cost: receiptFields.total_cost,
    litres: receiptFields.litres,
    price_per_litre: receiptFields.price_per_litre,
    station_name: receiptFields.station_name,
    fuel_type: receiptFields.fuel_type,
    date: receiptFields.date,
    odometer: odometerFields.odometer,
    trip_meter: odometerFields.trip_meter,
  };
}

function normalizeImageSources(
  images: TransactionImageSource[] | (string | File | Blob)[]
): TransactionImageSource[] {
  return images.map((image, index) => {
    if (isRoleTaggedImage(image)) {
      return image;
    }

    return {
      role: index === 0 ? "receipt" : index === 1 ? "odometer" : "other",
      image,
    };
  });
}

function isRoleTaggedImage(
  image: TransactionImageSource | string | File | Blob
): image is TransactionImageSource {
  return (
    typeof image === "object" &&
    image !== null &&
    "role" in image &&
    "image" in image
  );
}

export { parseOcrText } from "./parser";
