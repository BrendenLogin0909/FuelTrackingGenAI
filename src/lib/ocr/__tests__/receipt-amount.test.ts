import { extractFuelReceiptAmount } from "../receipt-amount";

describe("extractFuelReceiptAmount", () => {
  it("returns the fuel line amount when a receipt includes non-fuel items", () => {
    const receipt = [
      "7-ELEVEN",
      "E10 fuel: 44.03 L @ $2.099/L = $92.42",
      "7-ELEVEN 600ML STILL W 1 $14.00",
      "TOTAL $106.42",
    ].join("\n");

    expect(extractFuelReceiptAmount(receipt)).toBe(92.42);
  });

  it("subtracts fuel discounts from the fuel amount", () => {
    const receipt = [
      "BP",
      "Premium Unleaded 95 40.00 L @ $2.10/L = $84.00",
      "Fuel discount -$4.00",
      "Coffee $5.00",
      "TOTAL $85.00",
    ].join("\n");

    expect(extractFuelReceiptAmount(receipt)).toBe(80);
  });

  it("returns undefined when no fuel line is present", () => {
    expect(extractFuelReceiptAmount("Snacks 5.00\nTOTAL 5.00")).toBeUndefined();
  });
});
