import { analyzeExtractedTextByRole, parseExtractedTextByRole } from "../index";

describe("parseExtractedTextByRole", () => {
  it("extracts receipt fields from receipt text only", () => {
    const result = parseExtractedTextByRole({
      receipt: ["Total 95.40\nLitres 45.2\nBP Northgate"],
      odometer: ["Odometer: 125432 km"],
    });

    expect(result.total_cost).toBe(95.4);
    expect(result.litres).toBe(45.2);
    expect(result.station_name).toBe("BP Northgate");
    expect(result.odometer).toBe(125432);
  });

  it("does not search for odometer in receipt text when no odometer image is supplied", () => {
    const result = parseExtractedTextByRole({
      receipt: ["Receipt 123456\nTotal 92.42"],
    });

    expect(result.total_cost).toBe(92.42);
    expect(result.odometer).toBeUndefined();
  });

  it("ignores other images during extraction", () => {
    const result = parseExtractedTextByRole({
      receipt: ["Total 92.42"],
      other: ["Odometer: 555555 km"],
    });

    expect(result.total_cost).toBe(92.42);
    expect(result.odometer).toBeUndefined();
  });

  it("returns quality and fallback metadata for weak receipt extraction", () => {
    const result = analyzeExtractedTextByRole({
      receipt: ["Total 92.42"],
    });

    expect(result.fields.total_cost).toBe(92.42);
    expect(result.fallback.reason).toBe("missing_required_fields");
    expect(result.fallback.used).toBe(false);
    expect(result.fallback.missingFields).toEqual(
      expect.arrayContaining(["total_cost", "litres"])
    );
  });

  it("marks complete receipt and odometer extraction as locally satisfied", () => {
    const result = analyzeExtractedTextByRole({
      receipt: ["Total 95.40\nLitres 45.2\nBP Northgate\n15/01/2024"],
      odometer: ["Odometer: 125432 km"],
    });

    expect(result.fields.total_cost).toBe(95.4);
    expect(result.fields.odometer).toBe(125432);
    expect(result.fallback.attempted).toBe(false);
    expect(result.fallback.used).toBe(false);
    expect(result.fallback.source).toBe("local");
    expect(result.fallback.reason).toBeUndefined();
  });

  it("treats odometer-only reads as complete for the odometer role", () => {
    const result = analyzeExtractedTextByRole({
      odometer: ["Odometer: 125432 km"],
    });

    expect(result.fields.odometer).toBe(125432);
    expect(result.fallback.reason).toBeUndefined();
    expect(result.fallback.used).toBe(false);
  });
});
