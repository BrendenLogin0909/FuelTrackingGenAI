import {
  type ExtractedFields,
  type OcrExtractionResult,
  type OcrFallbackMetadata,
  type OcrFallbackReason,
  type OcrFieldKey,
  type OcrParsedFieldCompleteness,
  type OcrQualitySignals,
  type OcrTextByRole,
  type TransactionImageRole,
  type TransactionImageSource,
} from "../types/transaction";
import {
  getRetryPreprocessProfiles,
  getSafePreprocessProfile,
  imageSourceToDataUrl,
  prepareImageForOcr,
} from "./preprocess";
import { parseOcrText, scoreParsedOcrFields } from "./parser";

type TesseractWorker = Awaited<ReturnType<typeof import("tesseract.js").createWorker>>;

const TESSERACT_WORKER_OPTIONS = {
  workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js",
  corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/",
} as const;

const LOCAL_CONFIDENCE_FALLBACK_THRESHOLD = 55;

export interface ServerOcrFallbackContext {
  missingFields: OcrFieldKey[];
  fallbackReason: OcrFallbackReason;
  localResult: OcrExtractionResult;
}

export interface ExtractFromImagesOptions {
  serverFallback?: (
    images: TransactionImageSource[],
    context: ServerOcrFallbackContext
  ) => Promise<Partial<OcrTextByRole> | null>;
  onProgress?: (event: OcrProgressEvent) => void;
}

export interface OcrProgressEvent {
  stage:
    | "local_start"
    | "local_analyzing"
    | "local_retry"
    | "server_fallback"
    | "complete";
  role?: TransactionImageRole;
  message: string;
}

interface RoleOcrAttempt {
  role: TransactionImageRole;
  text: string;
  confidence?: number;
  profileId: string;
  rotation: number;
}

interface GroupedTextAnalysis {
  result: OcrExtractionResult;
  shouldFallback: boolean;
  missingFields: OcrFieldKey[];
  fallbackReason?: OcrFallbackReason;
}

export async function extractTextFromImage(
  imageSource: string | File | Blob
): Promise<string> {
  const worker = await createTesseractWorker();
  try {
    const result = await extractBestTextAttempt(worker, imageSource, "receipt");
    return result.text;
  } finally {
    await worker.terminate();
  }
}

export async function extractFromImages(
  images: TransactionImageSource[] | (string | File | Blob)[],
  options: ExtractFromImagesOptions = {}
): Promise<ExtractedFields> {
  const result = await extractFromImagesDetailed(images, options);
  return result.fields;
}

export async function extractFromImagesDetailed(
  images: TransactionImageSource[] | (string | File | Blob)[],
  options: ExtractFromImagesOptions = {}
): Promise<OcrExtractionResult> {
  options.onProgress?.({
    stage: "local_start",
    message: "Starting OCR analysis...",
  });
  const groupedText = createEmptyTextByRole();
  const normalized = normalizeImageSources(images);
  if (normalized.length === 0) {
    return analyzeExtractedTextByRole(groupedText);
  }

  const worker = await createTesseractWorker();
  const attempts: RoleOcrAttempt[] = [];
  try {
    for (const image of normalized) {
      options.onProgress?.({
        stage: "local_analyzing",
        role: image.role,
        message: `Analyzing ${image.role}...`,
      });
      const attempt = await extractBestTextAttempt(worker, image.image, image.role, options);
      attempts.push(attempt);
      if (attempt.text.trim()) {
        groupedText[image.role].push(attempt.text);
      }
    }
  } finally {
    await worker.terminate();
  }

  let analysis = analyzeGroupedTextWithAttempts(groupedText, attempts, false);

  if (analysis.shouldFallback && options.serverFallback) {
    options.onProgress?.({
      stage: "server_fallback",
      message: "Trying enhanced server OCR...",
    });
    const fallbackText = await options.serverFallback(normalized, {
      localResult: analysis.result,
      missingFields: analysis.missingFields,
      fallbackReason: analysis.fallbackReason ?? "parse_failure",
    });

    if (fallbackText) {
      const merged = mergeTextByRole(groupedText, fallbackText);
      analysis = analyzeGroupedTextWithAttempts(merged, attempts, true, analysis.fallbackReason);
    } else {
      analysis = {
        ...analysis,
        result: {
          ...analysis.result,
          fallback: {
            ...analysis.result.fallback,
            attempted: true,
            used: false,
            source: "local",
          },
        },
      };
    }
  }

  options.onProgress?.({
    stage: "complete",
    message: "OCR complete.",
  });
  return analysis.result;
}

export function analyzeExtractedTextByRole(
  groupedText: Partial<Record<TransactionImageRole, string[]>>
): OcrExtractionResult {
  const normalized = createEmptyTextByRole();
  normalized.receipt = [...(groupedText.receipt ?? [])];
  normalized.odometer = [...(groupedText.odometer ?? [])];
  normalized.other = [...(groupedText.other ?? [])];
  return analyzeGroupedTextWithAttempts(normalized, [], false).result;
}

export function parseExtractedTextByRole(
  groupedText: Partial<Record<TransactionImageRole, string[]>>
): ExtractedFields {
  return analyzeExtractedTextByRole(groupedText).fields;
}

async function createTesseractWorker(): Promise<TesseractWorker> {
  const { createWorker } = await import("tesseract.js");
  return createWorker("eng", 1, TESSERACT_WORKER_OPTIONS);
}

async function extractBestTextAttempt(
  worker: TesseractWorker,
  imageSource: string | File | Blob,
  role: TransactionImageRole,
  options: ExtractFromImagesOptions = {}
): Promise<RoleOcrAttempt> {
  const sourceDataUrl = await imageSourceToDataUrl(imageSource);
  const attempts: RoleOcrAttempt[] = [
    await runSingleAttempt(worker, sourceDataUrl, role, getSafePreprocessProfile(role), 0),
  ];

  const baseAttempt = attempts[0];
  if (shouldAcceptAttempt(baseAttempt)) {
    return baseAttempt;
  }

  options.onProgress?.({
    stage: "local_retry",
    role,
    message:
      role === "receipt"
        ? "Initial receipt scan was weak. Reprocessing with enhanced OCR..."
        : role === "odometer"
          ? "Initial odometer scan was weak. Reprocessing with enhanced OCR..."
          : "Initial scan was weak. Reprocessing with enhanced OCR...",
  });

  for (const profile of getRetryPreprocessProfiles(role)) {
    for (const rotation of profile.rotations) {
      attempts.push(await runSingleAttempt(worker, sourceDataUrl, role, profile, rotation));
    }
  }

  if (attempts.length === 0) {
    return {
      role,
      text: "",
      profileId: "unprocessed",
      rotation: 0,
    };
  }

  return attempts.reduce((best, current) =>
    scoreAttempt(current) > scoreAttempt(best) ? current : best
  );
}

async function runSingleAttempt(
  worker: TesseractWorker,
  sourceDataUrl: string,
  role: TransactionImageRole,
  profile: Parameters<typeof prepareImageForOcr>[1],
  rotation: number
): Promise<RoleOcrAttempt> {
  const prepared = await prepareImageForOcr(sourceDataUrl, profile, rotation);
  const recognition = await worker.recognize(prepared.dataUrl);
  return {
    role,
    text: recognition.data.text ?? "",
    confidence: recognition.data.confidence,
    profileId: prepared.profileId,
    rotation: prepared.rotation,
  };
}

function scoreAttempt(attempt: RoleOcrAttempt): number {
  const fields = parseOcrText(attempt.text);
  const quality = scoreParsedOcrFields(attempt.text, fields, {
    requiredFields: getRequiredFieldsForRole(attempt.role),
  });
  const confidence = attempt.confidence ?? 0;
  const textLengthBoost = Math.min(12, Math.floor(attempt.text.trim().length / 20));
  return quality.score + confidence * 0.35 + textLengthBoost;
}

function shouldAcceptAttempt(attempt: RoleOcrAttempt): boolean {
  const fields = parseOcrText(attempt.text);
  const quality = scoreParsedOcrFields(attempt.text, fields, {
    requiredFields: getRequiredFieldsForRole(attempt.role),
  });
  return !quality.shouldFallback && quality.label !== "weak";
}

function analyzeGroupedTextWithAttempts(
  groupedText: OcrTextByRole,
  attempts: RoleOcrAttempt[],
  fallbackUsed: boolean,
  priorFallbackReason?: OcrFallbackReason
): GroupedTextAnalysis {
  const receiptText = groupedText.receipt.join("\n\n");
  const odometerText = groupedText.odometer.join("\n\n");

  const receiptFields = receiptText ? parseOcrText(receiptText) : {};
  const odometerFields = odometerText ? parseOcrText(odometerText) : {};
  const fields = mergeFields(receiptFields, odometerFields);

  const completeness = getCompleteness(fields);
  const receiptQuality = scoreParsedOcrFields(receiptText, receiptFields, {
    requiredFields: groupedText.receipt.length > 0 ? ["total_cost", "litres"] : [],
  });
  const odometerQuality = scoreParsedOcrFields(odometerText, odometerFields, {
    requiredFields: groupedText.odometer.length > 0 ? ["odometer"] : [],
  });

  const missingFields = collectMissingRequiredFields(fields, groupedText);
  const averageConfidence = average(
    attempts.map((attempt) => attempt.confidence).filter(isNumber)
  );
  const hasExpectedKeywords =
    receiptQuality.textSignals.hasTotalCue ||
    receiptQuality.textSignals.hasLitresCue ||
    odometerQuality.textSignals.hasOdometerCue;

  const reasons = Array.from(
    new Set([...receiptQuality.reasons, ...odometerQuality.reasons])
  );
  if (averageConfidence != null && averageConfidence < LOCAL_CONFIDENCE_FALLBACK_THRESHOLD) {
    reasons.push("low_confidence");
  }

  const quality = buildQualitySignals(
    groupedText,
    fields,
    receiptQuality,
    odometerQuality,
    averageConfidence,
    hasExpectedKeywords,
    reasons,
    missingFields
  );

  const fallbackReason =
    missingFields.length > 0
      ? "missing_required_fields"
      : averageConfidence != null && averageConfidence < LOCAL_CONFIDENCE_FALLBACK_THRESHOLD
        ? "low_confidence"
        : reasons.includes("total_litres_rate_mismatch") || reasons.includes("no_fields_parsed")
          ? "ambiguous_parse"
          : priorFallbackReason;

  const shouldFallback =
    missingFields.length > 0 ||
    receiptQuality.shouldFallback ||
    (groupedText.odometer.length > 0 && odometerQuality.shouldFallback) ||
    (averageConfidence != null && averageConfidence < LOCAL_CONFIDENCE_FALLBACK_THRESHOLD);

  const fallback = buildFallbackMetadata(
    fallbackUsed,
    fallbackReason,
    missingFields,
    shouldFallback
  );

  return {
    shouldFallback,
    missingFields,
    fallbackReason,
    result: {
      textByRole: groupedText,
      fields,
      completeness,
      quality,
      fallback,
    },
  };
}

function buildQualitySignals(
  groupedText: OcrTextByRole,
  fields: ExtractedFields,
  receiptQuality: ReturnType<typeof scoreParsedOcrFields>,
  odometerQuality: ReturnType<typeof scoreParsedOcrFields>,
  averageConfidence: number | undefined,
  hasExpectedKeywords: boolean,
  reasons: string[],
  missingFields: OcrFieldKey[]
): OcrQualitySignals {
  const combinedText = [groupedText.receipt, groupedText.odometer, groupedText.other]
    .flat()
    .join("\n\n");
  const recognizedFieldCount = Object.values(fields).filter((value) => value != null).length;
  const expectedFieldCount =
    (groupedText.receipt.length > 0 ? 2 : 0) + (groupedText.odometer.length > 0 ? 1 : 0);
  const score = Math.round(
    weightedAverage([
      { value: receiptQuality.score, weight: groupedText.receipt.length > 0 ? 0.7 : 0 },
      { value: odometerQuality.score, weight: groupedText.odometer.length > 0 ? 0.3 : 0 },
    ]) ?? 0
  );

  return {
    score,
    label: score >= 75 ? "strong" : score >= 45 ? "moderate" : "weak",
    confidence: averageConfidence,
    normalizedConfidence: averageConfidence != null ? Math.round(averageConfidence) / 100 : undefined,
    textLength: combinedText.length,
    lineCount: combinedText ? combinedText.split(/\r?\n/).filter(Boolean).length : 0,
    wordCount: combinedText ? combinedText.trim().split(/\s+/).filter(Boolean).length : 0,
    characterCount: combinedText.length,
    hasExpectedKeywords,
    expectedFieldCount,
    recognizedFieldCount,
    plausibilityScore: weightedAverage([
      { value: receiptQuality.score, weight: groupedText.receipt.length > 0 ? 0.6 : 0 },
      { value: odometerQuality.score, weight: groupedText.odometer.length > 0 ? 0.4 : 0 },
    ]),
    consistencyScore: weightedAverage([
      { value: receiptQuality.consistency * 100, weight: groupedText.receipt.length > 0 ? 0.7 : 0 },
      { value: odometerQuality.consistency * 100, weight: groupedText.odometer.length > 0 ? 0.3 : 0 },
    ]),
    reasons,
    missingFields,
  };
}

function buildFallbackMetadata(
  fallbackUsed: boolean,
  fallbackReason: OcrFallbackReason | undefined,
  missingFields: OcrFieldKey[],
  shouldFallback: boolean
): OcrFallbackMetadata {
  return {
    attempted: fallbackUsed,
    used: fallbackUsed,
    reason: fallbackReason,
    source: fallbackUsed ? "hybrid" : "local",
    threshold: LOCAL_CONFIDENCE_FALLBACK_THRESHOLD,
    missingFields: shouldFallback ? missingFields : [],
  };
}

function mergeFields(
  receiptFields: Partial<ExtractedFields>,
  odometerFields: Partial<ExtractedFields>
): ExtractedFields {
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

function getCompleteness(fields: Partial<ExtractedFields>): OcrParsedFieldCompleteness {
  return {
    total_cost: fields.total_cost != null,
    litres: fields.litres != null,
    price_per_litre: fields.price_per_litre != null,
    station_name: fields.station_name != null,
    fuel_type: fields.fuel_type != null,
    date: fields.date != null,
    odometer: fields.odometer != null,
    trip_meter: fields.trip_meter != null,
  };
}

function collectMissingRequiredFields(
  fields: Partial<ExtractedFields>,
  groupedText: OcrTextByRole
): OcrFieldKey[] {
  const missing: OcrFieldKey[] = [];
  if (groupedText.receipt.length > 0) {
    if (fields.total_cost == null) missing.push("total_cost");
    if (fields.litres == null) missing.push("litres");
  }
  if (groupedText.odometer.length > 0 && fields.odometer == null) {
    missing.push("odometer");
  }
  return missing;
}

function getRequiredFieldsForRole(role: TransactionImageRole): OcrFieldKey[] {
  if (role === "odometer") {
    return ["odometer"];
  }
  if (role === "receipt") {
    return ["total_cost", "litres"];
  }
  return [];
}

function createEmptyTextByRole(): OcrTextByRole {
  return {
    receipt: [],
    odometer: [],
    other: [],
  };
}

function mergeTextByRole(
  base: OcrTextByRole,
  incoming: Partial<OcrTextByRole>
): OcrTextByRole {
  return {
    receipt: [...base.receipt, ...(incoming.receipt ?? [])],
    odometer: [...base.odometer, ...(incoming.odometer ?? [])],
    other: [...base.other, ...(incoming.other ?? [])],
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

function weightedAverage(
  items: Array<{ value: number; weight: number }>
): number | undefined {
  const active = items.filter((item) => item.weight > 0);
  if (active.length === 0) {
    return undefined;
  }

  const totalWeight = active.reduce((sum, item) => sum + item.weight, 0);
  return active.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}

function average(values: number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export { parseOcrText, scoreParsedOcrFields } from "./parser";
