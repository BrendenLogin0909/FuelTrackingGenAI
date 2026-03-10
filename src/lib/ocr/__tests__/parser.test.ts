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
});
