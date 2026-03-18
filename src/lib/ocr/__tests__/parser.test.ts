import { parseOcrText } from "../parser";

describe("parseOcrText", () => {
  it("extracts total cost", () => {
    const r = parseOcrText("Total 85.50\nAmount paid: $85.50");
    expect(r.total_cost).toBe(85.5);
  });

  it("extracts litres", () => {
    const r = parseOcrText("Volume: 45.2 L\nLitres 45.2");
    expect(r.litres).toBe(45.2);
  });

  it("extracts odometer", () => {
    const r = parseOcrText("Odometer: 125432 km");
    expect(r.odometer).toBe(125432);
  });

  it("extracts odometer when the label appears after the number", () => {
    const r = parseOcrText("125432 km");
    expect(r.odometer).toBe(125432);
  });

  it("does not infer odometer from random receipt numbers", () => {
    const r = parseOcrText("Receipt No: 123456\nPump 4\nTotal 85.50");
    expect(r.odometer).toBeUndefined();
  });

  it("extracts date and normalises to ISO", () => {
    const r = parseOcrText("Date: 15/01/2024");
    expect(r.date).toBe("2024-01-15");
  });

  it("uses today when no date found", () => {
    const r = parseOcrText("Total 50.00");
    expect(r.date).toBeDefined();
    expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("calculates price_per_litre from total and litres", () => {
    const r = parseOcrText("Total 90.00\nLitres 45");
    expect(r.total_cost).toBe(90);
    expect(r.litres).toBe(45);
    expect(r.price_per_litre).toBe(2);
  });

  it("extracts price_per_litre from an explicit receipt rate", () => {
    const r = parseOcrText("E10 44.03 L @ $2.099/L = $92.42");
    expect(r.price_per_litre).toBe(2.099);
  });

  it("extracts Australian fuel type variants from receipt text", () => {
    expect(parseOcrText("Fuel type: Unleaded 91").fuel_type).toBe("U91");
    expect(parseOcrText("Premium 95 35.00 L").fuel_type).toBe("P95");
    expect(parseOcrText("Vehicle fuel: premium diesel").fuel_type).toBe("Premium Diesel");
    expect(parseOcrText("LPG / Autogas sale").fuel_type).toBe("LPG");
  });

  it("prefers the fuel amount when a receipt includes non-fuel items", () => {
    const receipt = [
      "7-ELEVEN",
      "E10 fuel: 44.03 L @ $2.099/L = $92.42",
      "7-ELEVEN 600ML STILL W 1 $14.00",
      "TOTAL $106.42",
    ].join("\n");

    const r = parseOcrText(receipt);

    expect(r.total_cost).toBe(92.42);
  });

  it("prefers Total over fuel line when fuel line OCR misreads digit (e.g. 5→9)", () => {
    // Simulates OCR misreading $59.64 as $99.64 on fuel line; Total line is correct
    const receipt = [
      "7-ELEVEN",
      "E10 31.74 L @ $1.879/ L $99.64",
      "Total: $59.64",
      "MASTERCARD: $59.64",
    ].join("\n");

    const r = parseOcrText(receipt);

    expect(r.total_cost).toBe(59.64);
  });

  it("applies fuel discounts when deriving the fuel amount", () => {
    const receipt = [
      "BP",
      "Premium Unleaded 95 40.00 L @ $2.10/L = $84.00",
      "Loyalty discount -$4.00",
      "Coffee $5.00",
      "TOTAL $85.00",
    ].join("\n");

    const r = parseOcrText(receipt);

    expect(r.total_cost).toBe(80);
  });
});
