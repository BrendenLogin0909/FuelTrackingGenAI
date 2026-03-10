import {
  calculateDistance,
  calculateLPer100km,
  calculateKmPerLitre,
  calculateCostPerKm,
  enrichTransactionsWithMetrics,
  getLatestMetrics,
  getAverageEfficiency,
} from "../index";
import type { FuelTransaction } from "../../types/transaction";

describe("calculations", () => {
  describe("calculateDistance", () => {
    it("returns difference when current > previous", () => {
      expect(calculateDistance(125000, 124500)).toBe(500);
    });
    it("returns 0 when current <= previous", () => {
      expect(calculateDistance(124500, 125000)).toBe(0);
    });
  });

  describe("calculateLPer100km", () => {
    it("computes L/100km correctly", () => {
      expect(calculateLPer100km(45, 500)).toBeCloseTo(9);
    });
    it("returns 0 when distance is 0", () => {
      expect(calculateLPer100km(45, 0)).toBe(0);
    });
  });

  describe("calculateKmPerLitre", () => {
    it("computes km/L correctly", () => {
      expect(calculateKmPerLitre(45, 500)).toBeCloseTo(11.11, 1);
    });
    it("returns 0 when litres is 0", () => {
      expect(calculateKmPerLitre(0, 500)).toBe(0);
    });
  });

  describe("calculateCostPerKm", () => {
    it("computes cost per km correctly", () => {
      expect(calculateCostPerKm(85.5, 500)).toBeCloseTo(0.171);
    });
  });

  describe("enrichTransactionsWithMetrics", () => {
    it("adds distance and fuel_efficiency when consecutive odometer exists", () => {
      const tx: FuelTransaction[] = [
        {
          id: "1",
          date: "2024-01-01",
          odometer: 124000,
          litres: 40,
          total_cost: 80,
          created_at: "",
          updated_at: "",
        },
        {
          id: "2",
          date: "2024-01-15",
          odometer: 124500,
          litres: 45,
          total_cost: 90,
          created_at: "",
          updated_at: "",
        },
      ];
      const enriched = enrichTransactionsWithMetrics(tx);
      expect(enriched[1].distance_since_last).toBe(500);
      expect(enriched[1].fuel_efficiency).toBeCloseTo(9);
    });
    it("does not add metrics when odometer missing", () => {
      const tx: FuelTransaction[] = [
        {
          id: "1",
          date: "2024-01-01",
          litres: 45,
          created_at: "",
          updated_at: "",
        },
      ];
      const enriched = enrichTransactionsWithMetrics(tx);
      expect(enriched[0].fuel_efficiency).toBeUndefined();
    });
  });

  describe("getLatestMetrics", () => {
    it("returns nulls when no transactions with efficiency", () => {
      const m = getLatestMetrics([]);
      expect(m.litresPer100km).toBeNull();
    });
    it("returns latest metrics when available", () => {
      const tx: FuelTransaction[] = [
        {
          id: "1",
          date: "2024-01-01",
          odometer: 124000,
          litres: 40,
          total_cost: 80,
          created_at: "",
          updated_at: "",
        },
        {
          id: "2",
          date: "2024-01-15",
          odometer: 124500,
          litres: 45,
          total_cost: 90,
          created_at: "",
          updated_at: "",
        },
      ];
      const enriched = enrichTransactionsWithMetrics(tx);
      const m = getLatestMetrics(enriched);
      expect(m.litresPer100km).toBeCloseTo(9);
      expect(m.costPerKm).toBeCloseTo(0.18);
    });
  });

  describe("getAverageEfficiency", () => {
    it("returns null when no efficiency data", () => {
      expect(getAverageEfficiency([])).toBeNull();
    });
    it("returns average of all efficiencies", () => {
      const tx: FuelTransaction[] = [
        {
          id: "1",
          date: "2024-01-01",
          odometer: 124000,
          litres: 40,
          total_cost: 80,
          fuel_efficiency: 10,
          created_at: "",
          updated_at: "",
        },
        {
          id: "2",
          date: "2024-01-15",
          odometer: 124500,
          litres: 45,
          total_cost: 90,
          fuel_efficiency: 8,
          created_at: "",
          updated_at: "",
        },
      ];
      expect(getAverageEfficiency(tx)).toBe(9);
    });
  });
});
