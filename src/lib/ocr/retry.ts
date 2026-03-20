import type { ExtractedFields, TransactionImageRole } from "../types/transaction";
import { OCR_LOW_CONFIDENCE_THRESHOLD } from "./config";

export type OcrPassResult = {
  /** Non-empty OCR segments per image (same order as inputs). */
  texts: string[];
  /** Joined for logging / retry heuristics. */
  text: string;
  confidence: number;
  fields: ExtractedFields;
  timingMs: number;
};

function receiptPlausibilityFails(f: ExtractedFields): boolean {
  const { total_cost: t, litres: l, price_per_litre: p } = f;
  if (t == null || l == null || p == null || t <= 0 || l <= 0 || p <= 0) {
    return false;
  }
  const expected = l * p;
  return Math.abs(expected - t) / t > 0.2;
}

function receiptMissingRequired(f: ExtractedFields): boolean {
  return f.total_cost == null;
}

function odometerMissingRequired(f: ExtractedFields): boolean {
  return f.odometer == null;
}

/**
 * Whether to run another OCR pass for this role (preprocess may differ later).
 */
export function shouldRetryRole(
  role: TransactionImageRole,
  result: OcrPassResult
): { retry: boolean; reason: string } {
  if (role === "other") {
    return { retry: false, reason: "role_other" };
  }

  const { fields, confidence, text } = result;

  if (role === "receipt") {
    if (receiptMissingRequired(fields)) {
      return { retry: true, reason: "receipt_missing_total" };
    }
    if (receiptPlausibilityFails(fields)) {
      return { retry: true, reason: "receipt_plausibility" };
    }
  }

  if (role === "odometer") {
    if (odometerMissingRequired(fields)) {
      return { retry: true, reason: "odometer_missing" };
    }
  }

  if (
    text.trim().length > 0 &&
    confidence < OCR_LOW_CONFIDENCE_THRESHOLD
  ) {
    return { retry: true, reason: "low_confidence" };
  }

  return { retry: false, reason: "ok" };
}
