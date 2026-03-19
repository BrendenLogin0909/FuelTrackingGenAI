/**
 * Fuel transaction data model (PRD Section 8)
 */
export const AUSTRALIAN_FUEL_TYPES = [
  "U91",
  "P95",
  "P98",
  "E10",
  "E85",
  "Diesel",
  "Premium Diesel",
  "LPG",
] as const;

export type FuelTypeOption = typeof AUSTRALIAN_FUEL_TYPES[number];

export interface FuelTransaction {
  id: string;
  date: string; // ISO date
  litres?: number;
  total_cost?: number;
  price_per_litre?: number;
  odometer?: number;
  distance_since_last?: number; // calculated
  fuel_efficiency?: number; // L/100km, calculated
  station_name?: string;
  fuel_type?: FuelTypeOption;
  receipt_image?: string; // base64 or blob ref
  odometer_image?: string;
  extra_images?: string[];
  created_at: string;
  updated_at: string;
}

export type TransactionImageRole = "receipt" | "odometer" | "other";

export interface TransactionImageInput {
  id: string;
  role: TransactionImageRole;
  file: File;
  preview_url?: string;
}

export interface TransactionImageSource {
  role: TransactionImageRole;
  image: string | File | Blob;
}

export interface ExtractedFields {
  total_cost?: number;
  litres?: number;
  price_per_litre?: number;
  station_name?: string;
  fuel_type?: FuelTypeOption;
  date?: string;
  odometer?: number;
  trip_meter?: number;
}

export type OcrFieldKey = keyof ExtractedFields;

export type OcrExtractionSource = "local" | "server" | "hybrid";

export type OcrFallbackReason =
  | "missing_required_fields"
  | "low_confidence"
  | "ambiguous_parse"
  | "parse_failure"
  | "unsupported_image"
  | "manual_override";

export interface OcrTextByRole {
  receipt: string[];
  odometer: string[];
  other: string[];
}

export interface OcrQualitySignals {
  score?: number;
  label?: "strong" | "moderate" | "weak";
  confidence?: number;
  normalizedConfidence?: number;
  textLength?: number;
  lineCount?: number;
  wordCount?: number;
  characterCount?: number;
  detectedLanguage?: string;
  hasExpectedKeywords?: boolean;
  expectedFieldCount?: number;
  recognizedFieldCount?: number;
  plausibilityScore?: number;
  consistencyScore?: number;
  reasons?: string[];
  missingFields?: OcrFieldKey[];
}

export interface OcrParsedFieldCompleteness {
  total_cost: boolean;
  litres: boolean;
  price_per_litre: boolean;
  station_name: boolean;
  fuel_type: boolean;
  date: boolean;
  odometer: boolean;
  trip_meter: boolean;
}

export interface OcrFallbackMetadata {
  attempted: boolean;
  used: boolean;
  reason?: OcrFallbackReason;
  source?: OcrExtractionSource;
  threshold?: number;
  missingFields?: OcrFieldKey[];
}

export interface OcrExtractionResult {
  textByRole: OcrTextByRole;
  fields: ExtractedFields;
  completeness: OcrParsedFieldCompleteness;
  quality: OcrQualitySignals;
  fallback: OcrFallbackMetadata;
}
