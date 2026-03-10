import type { FuelTransaction } from "../types/transaction";

/**
 * PRD Section 6: Fuel efficiency formulas
 * L/100km = (litres / distance) × 100
 * distance = current_odometer - previous_odometer
 */

export function calculateDistance(
  currentOdometer: number,
  previousOdometer: number
): number {
  return Math.max(0, currentOdometer - previousOdometer);
}

export function calculateLPer100km(litres: number, distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  return (litres / distanceKm) * 100;
}

export function calculateKmPerLitre(litres: number, distanceKm: number): number {
  if (litres <= 0) return 0;
  return distanceKm / litres;
}

export function calculateCostPerKm(
  totalCost: number,
  distanceKm: number
): number {
  if (distanceKm <= 0) return 0;
  return totalCost / distanceKm;
}

export function enrichTransactionsWithMetrics(
  transactions: FuelTransaction[]
): FuelTransaction[] {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return sorted.map((tx, i) => {
    const prev = sorted[i - 1];
    const hasOdometer = tx.odometer != null && tx.odometer > 0;
    const hasLitres = tx.litres != null && tx.litres > 0;
    const prevOdometer = prev?.odometer;

    let distance_since_last: number | undefined;
    let fuel_efficiency: number | undefined;

    if (
      hasOdometer &&
      hasLitres &&
      prevOdometer != null &&
      prevOdometer >= 0 &&
      tx.odometer! > prevOdometer
    ) {
      const distance = calculateDistance(tx.odometer!, prevOdometer);
      distance_since_last = distance;
      fuel_efficiency = calculateLPer100km(tx.litres!, distance);
    }

    return { ...tx, distance_since_last, fuel_efficiency };
  });
}

export interface TransactionMetrics {
  litresPer100km: number | null;
  kmPerLitre: number | null;
  costPerKm: number | null;
  costPerTank: number | null;
  litresPerTank: number | null;
}

export function getLatestMetrics(
  transactions: FuelTransaction[]
): TransactionMetrics {
  const enriched = enrichTransactionsWithMetrics(transactions);
  const withEfficiency = enriched.filter(
    (t) => t.fuel_efficiency != null && t.fuel_efficiency > 0
  );
  const latest = withEfficiency[withEfficiency.length - 1];

  if (!latest) {
    return {
      litresPer100km: null,
      kmPerLitre: null,
      costPerKm: null,
      costPerTank: null,
      litresPerTank: null,
    };
  }

  const distance = latest.distance_since_last ?? 0;
  const litres = latest.litres ?? 0;
  const totalCost = latest.total_cost ?? 0;

  return {
    litresPer100km: latest.fuel_efficiency ?? null,
    kmPerLitre:
      distance > 0 && litres > 0 ? calculateKmPerLitre(litres, distance) : null,
    costPerKm: distance > 0 && totalCost > 0 ? totalCost / distance : null,
    costPerTank: totalCost > 0 ? totalCost : null,
    litresPerTank: litres > 0 ? litres : null,
  };
}

export function getAverageEfficiency(
  transactions: FuelTransaction[]
): number | null {
  const enriched = enrichTransactionsWithMetrics(transactions);
  const values = enriched
    .filter((t) => t.fuel_efficiency != null && t.fuel_efficiency > 0)
    .map((t) => t.fuel_efficiency!);

  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
