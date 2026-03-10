import {
  validateImageFile,
  sanitiseString,
  validateLitres,
  validateTotalCost,
  validateOdometer,
  validateDate,
} from "../validation";

describe("validation", () => {
  describe("validateImageFile", () => {
    it("accepts valid JPEG", () => {
      const file = new File(["x"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 1024 });
      expect(validateImageFile(file).valid).toBe(true);
    });
    it("rejects oversized file", () => {
      const file = new File(["x"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "size", { value: 11 * 1024 * 1024 });
      expect(validateImageFile(file).valid).toBe(false);
    });
    it("rejects invalid type", () => {
      const file = new File(["x"], "test.pdf", { type: "application/pdf" });
      Object.defineProperty(file, "size", { value: 1024 });
      expect(validateImageFile(file).valid).toBe(false);
    });
  });

  describe("sanitiseString", () => {
    it("strips angle brackets", () => {
      expect(sanitiseString("<script>alert(1)</script>")).not.toContain("<");
    });
    it("truncates long strings", () => {
      expect(sanitiseString("a".repeat(600)).length).toBeLessThanOrEqual(500);
    });
  });

  describe("validateLitres", () => {
    it("accepts valid litres", () => {
      expect(validateLitres(45.5)).toBe(true);
    });
    it("rejects negative", () => {
      expect(validateLitres(-1)).toBe(false);
    });
  });

  describe("validateOdometer", () => {
    it("accepts valid odometer", () => {
      expect(validateOdometer(125000)).toBe(true);
    });
    it("rejects decimal", () => {
      expect(validateOdometer(125000.5)).toBe(false);
    });
  });

  describe("validateDate", () => {
    it("accepts valid date", () => {
      expect(validateDate("2024-01-15")).toBe(true);
    });
    it("rejects invalid", () => {
      expect(validateDate("invalid")).toBe(false);
    });
  });
});
