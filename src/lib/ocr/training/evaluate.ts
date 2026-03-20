import type { ExtractedFields } from "../../types/transaction";
import { parseOcrText } from "../parser";
import type {
  CaseScore,
  FieldKey,
  FieldResult,
  ParserTrainingCase,
} from "./types";

const DEFAULT_TOL = 0.01;

function numbersClose(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

function checkField(
  key: FieldKey,
  actual: ExtractedFields,
  expected: ParserTrainingCase["expected"],
  tol: number
): FieldResult {
  const exp = expected[key];
  if (exp === undefined) {
    return { key, ok: true, detail: "skipped" };
  }

  const got = actual[key];

  if (typeof exp === "number") {
    if (typeof got !== "number" || Number.isNaN(got)) {
      return {
        key,
        ok: false,
        detail: `expected ${exp}, got ${String(got)}`,
      };
    }
    if (!numbersClose(got, exp, tol)) {
      return {
        key,
        ok: false,
        detail: `expected ${exp} (±${tol}), got ${got}`,
      };
    }
    return { key, ok: true };
  }

  if (typeof exp === "string") {
    const gs = got == null ? "" : String(got).trim();
    const es = exp.trim();
    if (gs !== es) {
      return { key, ok: false, detail: `expected "${es}", got "${gs}"` };
    }
    return { key, ok: true };
  }

  return { key, ok: true };
}

function mustNotViolations(
  actual: ExtractedFields,
  mustNotHave: ParserTrainingCase["mustNotHave"]
): string[] {
  if (!mustNotHave?.length) return [];
  const bad: string[] = [];
  for (const k of mustNotHave) {
    if (actual[k] !== undefined) {
      bad.push(`${String(k)} should be absent, got ${JSON.stringify(actual[k])}`);
    }
  }
  return bad;
}

function scoreForParsed(
  actual: ExtractedFields,
  c: ParserTrainingCase
): CaseScore {
  const tol = c.numberTolerance ?? DEFAULT_TOL;
  const keys = Object.keys(c.expected) as FieldKey[];
  const fieldResults: FieldResult[] = keys.map((key) =>
    checkField(key, actual, c.expected, tol)
  );
  const checked = fieldResults.filter((f) => f.detail !== "skipped");
  const passed = checked.filter((f) => f.ok).length;
  const mn = mustNotViolations(actual, c.mustNotHave);
  const mustKeys = c.mustNotHave ?? [];
  let mustPass = 0;
  for (const k of mustKeys) {
    if (actual[k] === undefined) mustPass += 1;
  }
  const denom = checked.length + mustKeys.length;
  const numer = passed + mustPass;
  const score = denom === 0 ? 1 : numer / denom;

  return {
    caseId: c.id,
    fieldsChecked: checked.length,
    fieldsPassed: passed,
    fieldResults,
    mustNotViolations: mn,
    score,
  };
}

export function evaluateParserCase(c: ParserTrainingCase): CaseScore {
  const primary = parseOcrText(c.ocrText);
  const out = scoreForParsed(primary, c);

  if (c.alternateOcrText != null && c.alternateOcrText !== "") {
    const alt = parseOcrText(c.alternateOcrText);
    out.alternateScore = scoreForParsed(alt, c).score;
  }

  return out;
}

export function evaluateAllCases(
  cases: ParserTrainingCase[]
): CaseScore[] {
  return cases.map(evaluateParserCase);
}

export function aggregateScores(scores: CaseScore[]): {
  meanPrimary: number;
  meanAlternate: number | null;
  minPrimary: number;
  failedCaseIds: string[];
} {
  if (scores.length === 0) {
    return { meanPrimary: 1, meanAlternate: null, minPrimary: 1, failedCaseIds: [] };
  }

  const meanPrimary =
    scores.reduce((s, x) => s + x.score, 0) / scores.length;

  const withAlt = scores.filter((s) => s.alternateScore != null);
  const meanAlternate =
    withAlt.length === 0
      ? null
      : withAlt.reduce((s, x) => s + (x.alternateScore as number), 0) /
        withAlt.length;

  const minPrimary = Math.min(...scores.map((s) => s.score));

  const failedCaseIds = scores
    .filter((s) => s.score < 1 || s.mustNotViolations.length > 0)
    .map((s) => s.caseId);

  return { meanPrimary, meanAlternate, minPrimary, failedCaseIds };
}
