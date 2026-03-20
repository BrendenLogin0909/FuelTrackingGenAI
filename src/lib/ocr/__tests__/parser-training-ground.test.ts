import cases from "../training/parser-cases.json";
import criticalConfig from "../training/critical-cases.json";
import { aggregateScores, evaluateAllCases } from "../training/evaluate";
import type { ParserTrainingCase } from "../training/types";

const loaded = cases as ParserTrainingCase[];

const optionalParserCaseIds = new Set(
  (criticalConfig as { parserCaseIdsOptional?: string[] })
    .parserCaseIdsOptional ?? []
);

describe("OCR parser training ground", () => {
  it("loads parser-cases.json", () => {
    expect(loaded.length).toBeGreaterThan(0);
  });

  it("every case scores 1 on primary ocrText (regression gate)", () => {
    const scores = evaluateAllCases(loaded);
    const agg = aggregateScores(scores);

    // eslint-disable-next-line no-console
    console.log(
      "\n[parser-training-ground] mean(primary)=",
      agg.meanPrimary.toFixed(4),
      " min(primary)=",
      agg.minPrimary.toFixed(4),
      agg.meanAlternate != null
        ? ` mean(alternate)=${agg.meanAlternate.toFixed(4)}`
        : ""
    );

    const primaryFails = scores.filter(
      (s) => s.score < 1 && !optionalParserCaseIds.has(s.caseId)
    );
    const optionalFails = scores.filter(
      (s) => s.score < 1 && optionalParserCaseIds.has(s.caseId)
    );
    for (const s of optionalFails) {
      // eslint-disable-next-line no-console
      console.warn(
        "[parser-training-ground] optional case below 1:",
        s.caseId,
        s.fieldResults
      );
    }
    if (primaryFails.length) {
      for (const s of primaryFails) {
        // eslint-disable-next-line no-console
        console.log("FAIL", s.caseId, s.fieldResults, s.mustNotViolations);
      }
    }
    expect(primaryFails).toEqual([]);

    const withAlt = scores.filter((s) => s.alternateScore != null);
    if (withAlt.length) {
      // eslint-disable-next-line no-console
      console.log(
        "[parser-training-ground] A/B (cases with alternateOcrText):",
        withAlt
          .map(
            (s) =>
              `${s.caseId}: primary=${s.score.toFixed(3)} alt=${(s.alternateScore as number).toFixed(3)}`
          )
          .join(" | ")
      );
    }
  });
});
