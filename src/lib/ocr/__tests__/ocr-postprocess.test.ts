import { applyOcrPostProcess } from "../ocr-postprocess";

describe("applyOcrPostProcess", () => {
  it("receipt: | → 1 before litres label", () => {
    expect(applyOcrPostProcess("Vol 31| litres", "receipt")).toMatch(/311\s+litres/i);
  });

  it("odometer: O between digits → 0", () => {
    expect(applyOcrPostProcess("odo 12O456 km", "odometer")).toContain(
      "120456"
    );
  });

  it("none is identity", () => {
    const t = "a|b O c";
    expect(applyOcrPostProcess(t, "none")).toBe(t);
  });
});
