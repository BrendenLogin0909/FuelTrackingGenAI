import {
  averageValues,
  detectDuplicates,
  formatCurrency,
  formatNumber,
  getEnrichedTransactions,
  getSortedTransactions,
} from "@/lib/dashboard/data";
import type { WidgetDefinition } from "@/lib/dashboard/types";

function hoursBetween(a: Date, b: Date) {
  return (a.getTime() - b.getTime()) / (1000 * 60 * 60);
}

function buildSeverityLabel(count: number) {
  return count === 1 ? "1 flag" : `${count} flags`;
}

export const exceptionWidgets: WidgetDefinition[] = [
  {
    id: "chg-027-high-unit-price-exceptions",
    title: "High Unit Price Exceptions",
    summary: "Flag transactions priced materially above the fleet average.",
    priority: "high",
    status: "ready",
    render: ({ transactions }) => {
      const average = averageValues(transactions, (tx) => tx.price_per_litre) ?? 0;
      const flagged = transactions
        .filter((tx) => tx.price_per_litre != null && tx.price_per_litre > average * 1.15)
        .sort((a, b) => (b.price_per_litre ?? 0) - (a.price_per_litre ?? 0))
        .slice(0, 5);

      return {
        headline: buildSeverityLabel(flagged.length),
        subheadline:
          average > 0
            ? `Average price benchmark is ${formatCurrency(average)}`
            : "No price benchmark available yet.",
        tableRows: flagged.map((tx) => ({
          label: `${tx.station_name || "Unknown station"} - ${tx.date}`,
          value: formatCurrency(tx.price_per_litre),
          tone: "bad",
        })),
        emptyMessage: flagged.length === 0 ? "No unit price outliers detected." : undefined,
      };
    },
  },
  {
    id: "chg-028-high-volume-exceptions",
    title: "High Volume Exceptions",
    summary: "Flag unusually large fuel fills.",
    priority: "medium",
    status: "ready",
    render: ({ transactions }) => {
      const average = averageValues(transactions, (tx) => tx.litres) ?? 0;
      const flagged = transactions
        .filter((tx) => tx.litres != null && tx.litres > average * 1.5)
        .sort((a, b) => (b.litres ?? 0) - (a.litres ?? 0))
        .slice(0, 5);

      return {
        headline: buildSeverityLabel(flagged.length),
        subheadline:
          average > 0
            ? `Average fill size benchmark is ${formatNumber(average, " L")}`
            : "No volume benchmark available yet.",
        tableRows: flagged.map((tx) => ({
          label: `${tx.station_name || "Unknown station"} - ${tx.date}`,
          value: formatNumber(tx.litres, " L"),
          tone: "bad",
        })),
        emptyMessage: flagged.length === 0 ? "No high-volume exceptions detected." : undefined,
      };
    },
  },
  {
    id: "chg-029-duplicate-transactions",
    title: "Duplicate Transaction Detection",
    summary: "Identify likely duplicate entries using receipt-level matching.",
    priority: "high",
    status: "ready",
    render: ({ transactions }) => {
      const duplicates = detectDuplicates(transactions);

      return {
        headline: `${duplicates.length} groups`,
        subheadline: "Matching date, station, litres, and total cost",
        tableRows: duplicates.slice(0, 5).map((group) => {
          const first = group[0];
          return {
            label: `${first.station_name || "Unknown station"} - ${first.date}`,
            value: `${group.length} entries`,
            tone: "bad",
          };
        }),
        emptyMessage: duplicates.length === 0 ? "No duplicate groups detected." : undefined,
      };
    },
  },
  {
    id: "chg-030-unrealistic-refill-timing",
    title: "Unrealistic Refill Timing",
    summary: "Flag refill sequences that occur too close together to be plausible.",
    priority: "high",
    status: "ready",
    render: ({ transactions }) => {
      const sorted = getSortedTransactions(transactions);
      const flagged = sorted
        .slice(1)
        .map((tx, index) => {
          const previous = sorted[index];
          return {
            tx,
            gapHours: hoursBetween(new Date(tx.date), new Date(previous.date)),
          };
        })
        .filter((item) => item.gapHours >= 0 && item.gapHours < 6)
        .slice(0, 5);

      return {
        headline: buildSeverityLabel(flagged.length),
        subheadline: "Transactions less than 6 hours apart",
        tableRows: flagged.map((item) => ({
          label: `${item.tx.station_name || "Unknown station"} - ${item.tx.date}`,
          value: `${item.gapHours.toFixed(1)} hours`,
          tone: "bad",
        })),
        emptyMessage:
          flagged.length === 0 ? "No unrealistic refill timing detected." : undefined,
      };
    },
  },
  {
    id: "chg-031-fuel-vs-receipt-total-mismatch",
    title: "Fuel vs Receipt Total Mismatch",
    summary: "Flag transactions where line-item maths does not match the saved total.",
    priority: "high",
    status: "ready",
    render: ({ transactions }) => {
      const flagged = transactions
        .filter(
          (tx) =>
            tx.litres != null &&
            tx.price_per_litre != null &&
            tx.total_cost != null &&
            Math.abs(tx.litres * tx.price_per_litre - tx.total_cost) > 0.25
        )
        .sort(
          (a, b) =>
            Math.abs((b.litres ?? 0) * (b.price_per_litre ?? 0) - (b.total_cost ?? 0)) -
            Math.abs((a.litres ?? 0) * (a.price_per_litre ?? 0) - (a.total_cost ?? 0))
        )
        .slice(0, 5);

      return {
        headline: buildSeverityLabel(flagged.length),
        subheadline: "Tolerance threshold is $0.25",
        tableRows: flagged.map((tx) => ({
          label: `${tx.station_name || "Unknown station"} - ${tx.date}`,
          value: formatCurrency(
            Math.abs((tx.litres ?? 0) * (tx.price_per_litre ?? 0) - (tx.total_cost ?? 0))
          ),
          tone: "bad",
        })),
        emptyMessage:
          flagged.length === 0 ? "No receipt total mismatches detected." : undefined,
      };
    },
  },
  {
    id: "chg-037-odometer-consistency",
    title: "Odometer Consistency",
    summary: "Identify missing, decreasing, or implausibly large odometer jumps.",
    priority: "high",
    status: "ready",
    render: ({ transactions }) => {
      const sorted = getSortedTransactions(transactions);
      const issues: Array<{ label: string; value: string; tone: "bad" }> = [];

      for (let i = 1; i < sorted.length; i += 1) {
        const current = sorted[i];
        const previous = sorted[i - 1];

        if (current.odometer == null || previous.odometer == null) {
          issues.push({
            label: `${current.date}`,
            value: "Missing odometer",
            tone: "bad",
          });
          continue;
        }

        const delta = current.odometer - previous.odometer;
        if (delta < 0) {
          issues.push({
            label: `${current.date}`,
            value: "Negative jump",
            tone: "bad",
          });
          continue;
        }

        if (delta > 1500) {
          issues.push({
            label: `${current.date}`,
            value: `${delta.toFixed(0)} km jump`,
            tone: "bad",
          });
        }
      }

      return {
        headline: buildSeverityLabel(issues.length),
        subheadline: "Missing, decreasing, or unusually large odometer changes",
        tableRows: issues.slice(0, 6),
        emptyMessage: issues.length === 0 ? "No odometer inconsistencies detected." : undefined,
      };
    },
  },
  {
    id: "chg-038-efficiency-decline-alert",
    title: "Efficiency Decline Alert",
    summary: "Highlight vehicles or periods where fuel efficiency is deteriorating.",
    priority: "high",
    status: "ready",
    size: "wide",
    render: ({ transactions }) => {
      const enriched = getEnrichedTransactions(transactions)
        .filter((tx) => tx.fuel_efficiency != null && tx.fuel_efficiency > 0)
        .slice(-6);
      const first = enriched[0]?.fuel_efficiency ?? null;
      const last = enriched.at(-1)?.fuel_efficiency ?? null;
      const delta = first != null && last != null ? last - first : null;

      return {
        headline:
          delta == null ? "Awaiting history" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} L/100km`,
        subheadline:
          delta == null
            ? "Not enough efficiency history to compare."
            : "Positive movement means fuel efficiency has worsened.",
        tableRows: enriched.map((tx) => ({
          label: tx.date,
          value: formatNumber(tx.fuel_efficiency, " L/100km"),
          tone: "default",
        })),
        emptyMessage:
          enriched.length === 0 ? "No efficiency history available." : undefined,
      };
    },
  },
];
