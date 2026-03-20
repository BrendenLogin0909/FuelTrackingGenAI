import type { ExtractedFields, FuelTypeOption } from "../../types/transaction";

export type ImageManifestEntry = {
  id: string;
  filename: string;
  role: "receipt" | "odometer" | "other";
  critical: boolean;
  expected: Partial<{
    total_cost: number;
    litres: number;
    price_per_litre: number;
    station_name: string;
    fuel_type: FuelTypeOption;
    date: string;
    odometer: number;
    trip_meter: number;
  }>;
};

const NUM_TOL = 0.02;

function close(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

function stationMatches(actual: string | undefined, needle: string): boolean {
  if (!actual) return false;
  const a = actual.toLowerCase().trim();
  const n = needle.toLowerCase().trim();
  return a.includes(n) || n.includes(a);
}

export type FieldMismatch = { field: string; detail: string };

export function compareExtractedToManifest(
  actual: ExtractedFields,
  expected: ImageManifestEntry["expected"]
): FieldMismatch[] {
  const mismatches: FieldMismatch[] = [];

  const checkNum = (
    key: keyof ExtractedFields,
    exp: number | undefined,
    tol: number
  ) => {
    if (exp === undefined) return;
    const got = actual[key];
    if (typeof got !== "number" || Number.isNaN(got)) {
      mismatches.push({ field: String(key), detail: `expected ${exp}, got ${String(got)}` });
      return;
    }
    if (!close(got, exp, tol)) {
      mismatches.push({
        field: String(key),
        detail: `expected ${exp} (±${tol}), got ${got}`,
      });
    }
  };

  checkNum("total_cost", expected.total_cost, NUM_TOL);
  checkNum("litres", expected.litres, NUM_TOL);
  checkNum("price_per_litre", expected.price_per_litre, NUM_TOL);
  checkNum("odometer", expected.odometer, 0);
  checkNum("trip_meter", expected.trip_meter, 0.08);

  if (expected.date !== undefined) {
    if (actual.date !== expected.date) {
      mismatches.push({
        field: "date",
        detail: `expected "${expected.date}", got "${String(actual.date)}"`,
      });
    }
  }

  if (expected.fuel_type !== undefined) {
    if (actual.fuel_type !== expected.fuel_type) {
      mismatches.push({
        field: "fuel_type",
        detail: `expected ${expected.fuel_type}, got ${String(actual.fuel_type)}`,
      });
    }
  }

  if (expected.station_name !== undefined) {
    if (!stationMatches(actual.station_name, expected.station_name)) {
      mismatches.push({
        field: "station_name",
        detail: `expected substring match for "${expected.station_name}", got "${String(actual.station_name)}"`,
      });
    }
  }

  return mismatches;
}

/** Number of expected fields in manifest entry (for scoring). */
export function countExpectedFields(
  expected: ImageManifestEntry["expected"]
): number {
  return Object.keys(expected).filter(
    (k) =>
      expected[k as keyof ImageManifestEntry["expected"]] !== undefined
  ).length;
}

/** Pass count = expected fields with no mismatch (at most one mismatch per field). */
export function manifestMatchScore(
  actual: ExtractedFields,
  expected: ImageManifestEntry["expected"]
): { pass: number; total: number; mismatches: FieldMismatch[] } {
  const mismatches = compareExtractedToManifest(actual, expected);
  const total = countExpectedFields(expected);
  const pass = Math.max(0, total - mismatches.length);
  return { pass, total, mismatches };
}
