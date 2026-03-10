"use client";

import { useMemo } from "react";
import {
  getLatestMetrics,
  getAverageEfficiency,
  type TransactionMetrics,
} from "@/lib/calculations";
import type { FuelTransaction } from "@/lib/types/transaction";

export function useMetrics(transactions: FuelTransaction[]) {
  const latest = useMemo(
    () => getLatestMetrics(transactions),
    [transactions]
  );
  const averageEfficiency = useMemo(
    () => getAverageEfficiency(transactions),
    [transactions]
  );
  return { latest, averageEfficiency };
}

export type { TransactionMetrics };
