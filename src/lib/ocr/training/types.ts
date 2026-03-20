import type { ExtractedFields, FuelTypeOption } from "../../types/transaction";

export type TransactionImageRole = "receipt" | "odometer" | "other";

/** Per-field expectation: number compared with tolerance; string exact after trim. */
export type ParserCaseExpected = Partial<{
  total_cost: number;
  litres: number;
  price_per_litre: number;
  odometer: number;
  trip_meter: number;
  station_name: string;
  fuel_type: FuelTypeOption;
  date: string;
}>;

export interface ParserTrainingCase {
  id: string;
  description?: string;
  role: TransactionImageRole;
  ocrText: string;
  /** If set, second pipeline output — harness scores both for A/B comparison. */
  alternateOcrText?: string;
  expected: ParserCaseExpected;
  /** Fields that must be absent (undefined) on the parsed result. */
  mustNotHave?: (keyof ExtractedFields)[];
  /** Numeric tolerance for all compared number fields in this case (default 0.01). */
  numberTolerance?: number;
}

export type FieldKey = keyof ParserCaseExpected;

export interface FieldResult {
  key: FieldKey;
  ok: boolean;
  detail?: string;
}

export interface CaseScore {
  caseId: string;
  fieldsChecked: number;
  fieldsPassed: number;
  fieldResults: FieldResult[];
  mustNotViolations: string[];
  /** Score for primary ocrText (0–1). */
  score: number;
  /** When alternateOcrText present: same for variant B. */
  alternateScore?: number;
}
