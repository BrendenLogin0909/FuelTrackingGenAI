import { enrichTransactionsWithMetrics } from "@/lib/calculations";
import type { FuelTransaction } from "@/lib/types/transaction";
import type { ChartPoint } from "./types";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-AU", { month: "short", year: "2-digit" });
}

function toDate(value: string) {
  return new Date(value);
}

export function getSortedTransactions(transactions: FuelTransaction[]) {
  return [...transactions].sort(
    (a, b) => toDate(a.date).getTime() - toDate(b.date).getTime()
  );
}

export function getEnrichedTransactions(transactions: FuelTransaction[]) {
  return enrichTransactionsWithMetrics(getSortedTransactions(transactions));
}

export function aggregateMonthly(
  transactions: FuelTransaction[],
  selector: (tx: FuelTransaction) => number | null | undefined
): ChartPoint[] {
  const buckets = new Map<string, { date: Date; value: number }>();

  for (const tx of transactions) {
    const date = toDate(tx.date);
    const key = monthKey(date);
    const value = selector(tx);
    if (value == null || Number.isNaN(value)) continue;

    const current = buckets.get(key) ?? { date, value: 0 };
    current.value += value;
    buckets.set(key, current);
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => ({
      label: monthLabel(entry.date),
      value: Number(entry.value.toFixed(2)),
    }));
}

export function averageMonthly(
  transactions: FuelTransaction[],
  selector: (tx: FuelTransaction) => number | null | undefined
): ChartPoint[] {
  const buckets = new Map<string, { date: Date; sum: number; count: number }>();

  for (const tx of transactions) {
    const date = toDate(tx.date);
    const key = monthKey(date);
    const value = selector(tx);
    if (value == null || Number.isNaN(value)) continue;

    const current = buckets.get(key) ?? { date, sum: 0, count: 0 };
    current.sum += value;
    current.count += 1;
    buckets.set(key, current);
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => ({
      label: monthLabel(entry.date),
      value: Number((entry.sum / entry.count).toFixed(2)),
    }));
}

export function groupAndSum(
  transactions: FuelTransaction[],
  groupBy: (tx: FuelTransaction) => string | undefined,
  selector: (tx: FuelTransaction) => number | null | undefined,
  limit = 6
): ChartPoint[] {
  const buckets = new Map<string, number>();

  for (const tx of transactions) {
    const key = groupBy(tx)?.trim();
    const value = selector(tx);
    if (!key || value == null || Number.isNaN(value)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + value);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value: Number(value.toFixed(2)) }));
}

export function getCurrentMonthTransactions(
  transactions: FuelTransaction[],
  now: Date
) {
  return transactions.filter((tx) => {
    const date = toDate(tx.date);
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  });
}

export function getPreviousMonthTransactions(
  transactions: FuelTransaction[],
  now: Date
) {
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return transactions.filter((tx) => {
    const date = toDate(tx.date);
    return (
      date.getFullYear() === previous.getFullYear() &&
      date.getMonth() === previous.getMonth()
    );
  });
}

export function sumValues(
  transactions: FuelTransaction[],
  selector: (tx: FuelTransaction) => number | null | undefined
) {
  return transactions.reduce((total, tx) => {
    const value = selector(tx);
    return value == null || Number.isNaN(value) ? total : total + value;
  }, 0);
}

export function averageValues(
  transactions: FuelTransaction[],
  selector: (tx: FuelTransaction) => number | null | undefined
) {
  const values = transactions
    .map(selector)
    .filter((value): value is number => value != null && !Number.isNaN(value));

  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function detectDuplicates(transactions: FuelTransaction[]) {
  const seen = new Map<string, FuelTransaction[]>();
  for (const tx of transactions) {
    const key = [
      tx.date,
      tx.station_name ?? "",
      tx.total_cost?.toFixed(2) ?? "",
      tx.litres?.toFixed(1) ?? "",
    ].join("|");
    const group = seen.get(key) ?? [];
    group.push(tx);
    seen.set(key, group);
  }
  return Array.from(seen.values()).filter((group) => group.length > 1);
}

export function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "---";
  return `$${value.toFixed(2)}`;
}

export function formatNumber(value: number | null | undefined, suffix = "") {
  if (value == null || Number.isNaN(value)) return "---";
  return `${value.toFixed(1)}${suffix}`;
}

export function getDayOfWeekCounts(transactions: FuelTransaction[]): ChartPoint[] {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = labels.map((label) => ({ label, value: 0 }));

  for (const tx of transactions) {
    counts[toDate(tx.date).getDay()].value += 1;
  }

  return counts;
}

export function getHourOfDayCounts(transactions: FuelTransaction[]): ChartPoint[] {
  const counts = Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, "0")}:00`,
    value: 0,
  }));

  for (const tx of transactions) {
    const source = tx.created_at || tx.updated_at || tx.date;
    counts[toDate(source).getHours()].value += 1;
  }

  return counts;
}

export function getOdometerProgression(transactions: FuelTransaction[]) {
  return transactions
    .filter((tx) => tx.odometer != null)
    .map((tx) => ({
      label: new Date(tx.date).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
      }),
      value: tx.odometer!,
    }));
}
