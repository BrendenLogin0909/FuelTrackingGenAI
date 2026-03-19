import {
  aggregateMonthly,
  averageMonthly,
  averageValues,
  formatCurrency,
  formatNumber,
  getCurrentMonthTransactions,
  getDayOfWeekCounts,
  getEnrichedTransactions,
  getHourOfDayCounts,
  getOdometerProgression,
  getPreviousMonthTransactions,
  getSortedTransactions,
  sumValues,
} from "@/lib/dashboard/data";
import type { ChartPoint, ReportContext, WidgetDefinition, WidgetRenderData } from "@/lib/dashboard/types";

function createWidget(
  widget: Omit<WidgetDefinition, "status" | "render"> & {
    render: (context: ReportContext) => WidgetRenderData;
  }
): WidgetDefinition {
  return {
    ...widget,
    status: "ready",
  };
}

function signedCurrency(value: number | null) {
  if (value == null) return "---";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatCurrency(value)}`;
}

function signedNumber(value: number | null, suffix = "") {
  if (value == null) return "---";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value, suffix)}`;
}

function currentMonthAverage(
  context: ReportContext,
  selector: (tx: ReportContext["transactions"][number]) => number | null | undefined
) {
  return averageValues(getCurrentMonthTransactions(context.transactions, context.now), selector);
}

function previousMonthAverage(
  context: ReportContext,
  selector: (tx: ReportContext["transactions"][number]) => number | null | undefined
) {
  return averageValues(getPreviousMonthTransactions(context.transactions, context.now), selector);
}

function averageByStation(
  transactions: ReportContext["transactions"]
): ChartPoint[] {
  const buckets = new Map<string, { total: number; count: number }>();

  for (const tx of transactions) {
    if (!tx.station_name || tx.price_per_litre == null) continue;
    const current = buckets.get(tx.station_name) ?? { total: 0, count: 0 };
    current.total += tx.price_per_litre;
    current.count += 1;
    buckets.set(tx.station_name, current);
  }

  return Array.from(buckets.entries())
    .map(([label, value]) => ({
      label,
      value: Number((value.total / value.count).toFixed(2)),
    }))
    .sort((a, b) => a.value - b.value);
}

function groupedCounts(
  transactions: ReportContext["transactions"],
  groupBy: (tx: ReportContext["transactions"][number]) => string | undefined,
  limit = 6
): ChartPoint[] {
  const counts = new Map<string, number>();

  for (const tx of transactions) {
    const key = groupBy(tx)?.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function stationComparisonRows(transactions: ReportContext["transactions"]) {
  const buckets = new Map<
    string,
    { count: number; spend: number; priceTotal: number; priceCount: number }
  >();

  for (const tx of transactions) {
    if (!tx.station_name) continue;
    const current =
      buckets.get(tx.station_name) ?? {
        count: 0,
        spend: 0,
        priceTotal: 0,
        priceCount: 0,
      };

    current.count += 1;
    current.spend += tx.total_cost ?? 0;
    if (tx.price_per_litre != null) {
      current.priceTotal += tx.price_per_litre;
      current.priceCount += 1;
    }
    buckets.set(tx.station_name, current);
  }

  return Array.from(buckets.entries())
    .map(([label, stats]) => ({
      label,
      count: stats.count,
      spend: stats.spend,
      averagePrice:
        stats.priceCount > 0 ? stats.priceTotal / stats.priceCount : null,
    }))
    .sort((a, b) => b.count - a.count);
}

export const coreWidgets: WidgetDefinition[] = [
  createWidget({
    id: "chg-044-monthly-summary-cards",
    title: "Monthly Summary",
    summary: "Top-level month snapshot for spend, litres, price, and efficiency.",
    priority: "high",
    size: "wide",
    render: ({ transactions, now }) => {
      const current = getCurrentMonthTransactions(transactions, now);
      const enriched = getEnrichedTransactions(current);
      return {
        headline: formatCurrency(sumValues(current, (tx) => tx.total_cost)),
        subheadline: "Current month fuel spend",
        tableRows: [
          { label: "Litres", value: formatNumber(sumValues(current, (tx) => tx.litres), " L") },
          { label: "Avg price", value: formatCurrency(averageValues(current, (tx) => tx.price_per_litre)) },
          {
            label: "Avg efficiency",
            value: formatNumber(averageValues(enriched, (tx) => tx.fuel_efficiency), " L/100km"),
          },
          { label: "Transactions", value: String(current.length) },
        ],
      };
    },
  }),
  createWidget({
    id: "chg-004-monthly-fuel-spend-trend",
    title: "Monthly Fuel Spend Trend",
    summary: "Track total fuel spend over time.",
    priority: "high",
    size: "wide",
    render: ({ transactions }) => {
      const points = aggregateMonthly(transactions, (tx) => tx.total_cost);
      const latest = points.length > 0 ? points[points.length - 1].value : null;
      const previous = points.length > 1 ? points[points.length - 2].value : null;
      const delta = latest != null && previous != null ? latest - previous : null;
      return {
        headline: formatCurrency(latest),
        subheadline:
          delta == null
            ? "Waiting for a previous month to compare."
            : `${signedCurrency(delta)} versus previous month`,
        points,
      };
    },
  }),
  createWidget({
    id: "chg-005-fuel-volume-trend",
    title: "Fuel Volume Trend",
    summary: "Track litres purchased over time.",
    priority: "high",
    size: "wide",
    render: ({ transactions }) => ({
      headline: formatNumber(aggregateMonthly(transactions, (tx) => tx.litres).slice(-1)[0]?.value, " L"),
      subheadline: "Latest monthly fuel volume",
      points: aggregateMonthly(transactions, (tx) => tx.litres),
    }),
  }),
  createWidget({
    id: "chg-006-average-fuel-price-trend",
    title: "Average Fuel Price Trend",
    summary: "Monitor average price per litre over time.",
    priority: "high",
    size: "wide",
    render: ({ transactions }) => {
      const points = averageMonthly(transactions, (tx) => tx.price_per_litre);
      return {
        headline: formatCurrency(points.length > 0 ? points[points.length - 1].value : null),
        subheadline: "Latest monthly average price per litre",
        points,
      };
    },
  }),
  createWidget({
    id: "chg-009-fuel-spend-by-station",
    title: "Fuel Spend by Station",
    summary: "Rank stations by total fuel spend.",
    priority: "high",
    render: ({ transactions }) => ({
      headline: `${groupedCounts(transactions, (tx) => tx.station_name).length} stations`,
      subheadline: "Stations ranked by transaction count and spend",
      points: groupedCounts(transactions, (tx) => tx.station_name),
      tableRows: stationComparisonRows(transactions)
        .slice(0, 5)
        .map((row) => ({
          label: row.label,
          value: `${formatCurrency(row.spend)} spend`,
        })),
    }),
  }),
  createWidget({
    id: "chg-011-fuel-spend-by-fuel-type",
    title: "Fuel Spend by Fuel Type",
    summary: "Show how spend is split by fuel category.",
    priority: "medium",
    render: ({ transactions }) => {
      const buckets = new Map<string, number>();
      for (const tx of transactions) {
        if (!tx.fuel_type) continue;
        buckets.set(tx.fuel_type, (buckets.get(tx.fuel_type) ?? 0) + (tx.total_cost ?? 0));
      }

      const points = Array.from(buckets.entries())
        .map(([label, value]) => ({ label, value: Number(value.toFixed(2)) }))
        .sort((a, b) => b.value - a.value);

      return {
        headline: formatCurrency(sumValues(transactions, (tx) => tx.total_cost)),
        subheadline: "Spend by fuel type",
        points,
      };
    },
  }),
  createWidget({
    id: "chg-012-average-efficiency-trend",
    title: "Average Efficiency Trend",
    summary: "Track average efficiency over time.",
    priority: "high",
    size: "wide",
    render: ({ transactions }) => {
      const enriched = getEnrichedTransactions(transactions);
      const points = averageMonthly(enriched, (tx) => tx.fuel_efficiency);
      return {
        headline: formatNumber(points.length > 0 ? points[points.length - 1].value : null, " L/100km"),
        subheadline: "Latest monthly average efficiency",
        points,
      };
    },
  }),
  createWidget({
    id: "chg-015-cost-per-kilometre",
    title: "Cost per Kilometre",
    summary: "Measure fuel operating cost per kilometre.",
    priority: "high",
    render: ({ transactions }) => {
      const enriched = getEnrichedTransactions(transactions).filter(
        (tx) => tx.total_cost != null && tx.distance_since_last != null && tx.distance_since_last > 0
      );
      const points = averageMonthly(enriched, (tx) =>
        tx.total_cost != null && tx.distance_since_last != null && tx.distance_since_last > 0
          ? tx.total_cost / tx.distance_since_last
          : null
      );
      const latest = points.length > 0 ? points[points.length - 1].value : null;
      return {
        headline: formatCurrency(latest),
        subheadline: "Latest monthly average cost per kilometre",
        points,
      };
    },
  }),
  createWidget({
    id: "chg-016-distance-travelled-trend",
    title: "Distance Travelled Trend",
    summary: "Track inferred distance travelled over time.",
    priority: "high",
    size: "wide",
    render: ({ transactions }) => {
      const enriched = getEnrichedTransactions(transactions);
      return {
        headline: formatNumber(sumValues(enriched, (tx) => tx.distance_since_last), " km"),
        subheadline: "Total inferred distance travelled",
        points: aggregateMonthly(enriched, (tx) => tx.distance_since_last),
      };
    },
  }),
  createWidget({
    id: "chg-017-odometer-growth",
    title: "Odometer Growth",
    summary: "Show odometer progression over time.",
    priority: "medium",
    size: "wide",
    render: ({ transactions }) => {
      const points = getOdometerProgression(getSortedTransactions(transactions));
      return {
        headline: formatNumber(points.length > 0 ? points[points.length - 1].value : null, " km"),
        subheadline: "Latest odometer reading",
        points,
      };
    },
  }),
  createWidget({
    id: "chg-020-forecasted-month-end-spend",
    title: "Forecasted Month-End Spend",
    summary: "Project month-end fuel spend from current activity.",
    priority: "medium",
    render: ({ transactions, now }) => {
      const current = getCurrentMonthTransactions(transactions, now);
      const spend = sumValues(current, (tx) => tx.total_cost);
      const daysElapsed = Math.max(now.getDate(), 1);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const forecast = (spend / daysElapsed) * daysInMonth;
      return {
        headline: formatCurrency(forecast),
        subheadline: `${formatCurrency(spend)} recorded so far this month`,
      };
    },
  }),
  createWidget({
    id: "chg-021-fuel-price-inflation-impact",
    title: "Fuel Price Inflation Impact",
    summary: "Compare average price movement against the previous month.",
    priority: "medium",
    render: (context) => {
      const current = currentMonthAverage(context, (tx) => tx.price_per_litre);
      const previous = previousMonthAverage(context, (tx) => tx.price_per_litre);
      const delta = current != null && previous != null ? current - previous : null;
      return {
        headline: signedCurrency(delta),
        subheadline: "Average price per litre change versus previous month",
        tableRows: [
          { label: "Current month", value: formatCurrency(current) },
          { label: "Previous month", value: formatCurrency(previous) },
        ],
      };
    },
  }),
  createWidget({
    id: "chg-022-fill-up-frequency",
    title: "Fill-up Frequency Trend",
    summary: "Show how often vehicles are refuelled over time.",
    priority: "medium",
    size: "wide",
    render: ({ transactions }) => ({
      headline: String(transactions.length),
      subheadline: "Total fuel transactions recorded",
      points: aggregateMonthly(transactions, () => 1),
    }),
  }),
  createWidget({
    id: "chg-023-average-fill-size",
    title: "Average Fill Size",
    summary: "Track the average litres purchased per transaction.",
    priority: "medium",
    render: ({ transactions }) => ({
      headline: formatNumber(averageValues(transactions, (tx) => tx.litres), " L"),
      subheadline: "Average litres per fill",
      tableRows: [
        { label: "Median-like view", value: formatNumber(averageValues(transactions, (tx) => tx.litres), " L") },
        { label: "Transaction count", value: String(transactions.length) },
      ],
    }),
  }),
  createWidget({
    id: "chg-024-time-of-day-pattern",
    title: "Time-of-Day Fueling Pattern",
    summary: "Show when fueling activity occurs most often.",
    priority: "low",
    render: ({ transactions }) => ({
      headline: `${transactions.length} transactions`,
      subheadline: "Grouped by hour of day",
      points: getHourOfDayCounts(transactions).filter((point) => point.value > 0),
    }),
  }),
  createWidget({
    id: "chg-025-day-of-week-pattern",
    title: "Day-of-Week Fueling Pattern",
    summary: "Show fueling activity by weekday.",
    priority: "low",
    render: ({ transactions }) => ({
      headline: `${transactions.length} transactions`,
      subheadline: "Grouped by weekday",
      points: getDayOfWeekCounts(transactions),
    }),
  }),
  createWidget({
    id: "chg-026-seasonal-fuel-trend",
    title: "Seasonal Fuel Trend",
    summary: "Compare month-to-month spend patterns for seasonal signals.",
    priority: "low",
    size: "wide",
    render: ({ transactions }) => ({
      headline: formatCurrency(sumValues(transactions, (tx) => tx.total_cost)),
      subheadline: "Monthly spend pattern across the available history",
      points: aggregateMonthly(transactions, (tx) => tx.total_cost),
    }),
  }),
  createWidget({
    id: "chg-041-station-price-comparison",
    title: "Station Price Comparison",
    summary: "Compare average price per litre by station.",
    priority: "high",
    render: ({ transactions }) => ({
      headline: `${averageByStation(transactions).length} stations`,
      subheadline: "Stations ranked from cheapest to most expensive",
      points: averageByStation(transactions),
      tableRows: stationComparisonRows(transactions).slice(0, 5).map((row) => ({
        label: row.label,
        value: `${formatCurrency(row.averagePrice)} avg`,
      })),
    }),
  }),
  createWidget({
    id: "chg-042-cheapest-vs-most-used-stations",
    title: "Cheapest vs Most Used Stations",
    summary: "Compare station price competitiveness with actual usage.",
    priority: "medium",
    size: "wide",
    render: ({ transactions }) => {
      const byUsage = stationComparisonRows(transactions);
      const cheapest = [...byUsage]
        .filter((row) => row.averagePrice != null)
        .sort((a, b) => (a.averagePrice ?? 0) - (b.averagePrice ?? 0))
        .slice(0, 5);

      return {
        headline: byUsage[0] ? byUsage[0].label : "---",
        subheadline: "Usage rank and price rank for the same stations",
        tableRows: byUsage.slice(0, 5).map((row) => ({
          label: row.label,
          value: `${row.count} tx / ${formatCurrency(row.averagePrice)}`,
        })),
        points: cheapest.map((row) => ({
          label: row.label,
          value: row.count,
        })),
      };
    },
  }),
  createWidget({
    id: "chg-043-carbon-emissions",
    title: "Carbon Emissions Estimate",
    summary: "Estimate CO2 emissions from recorded fuel consumption.",
    priority: "low",
    render: ({ transactions }) => {
      const litres = sumValues(transactions, (tx) => tx.litres);
      const estimatedKg = litres * 2.31;
      return {
        headline: `${estimatedKg.toFixed(0)} kg CO2`,
        subheadline: "Estimated using a generic 2.31 kg CO2 per litre factor",
      };
    },
  }),
  createWidget({
    id: "chg-045-what-changed-this-month",
    title: "What Changed This Month",
    summary: "Summarise the biggest month-over-month movements.",
    priority: "medium",
    size: "wide",
    render: ({ transactions, now }) => {
      const current = getCurrentMonthTransactions(transactions, now);
      const previous = getPreviousMonthTransactions(transactions, now);
      const spendDelta =
        sumValues(current, (tx) => tx.total_cost) - sumValues(previous, (tx) => tx.total_cost);
      const litresDelta =
        sumValues(current, (tx) => tx.litres) - sumValues(previous, (tx) => tx.litres);
      const currentEfficiency = averageValues(
        getEnrichedTransactions(current),
        (tx) => tx.fuel_efficiency
      );
      const previousEfficiency = averageValues(
        getEnrichedTransactions(previous),
        (tx) => tx.fuel_efficiency
      );
      const efficiencyDelta =
        currentEfficiency != null && previousEfficiency != null
          ? currentEfficiency - previousEfficiency
          : null;
      const frequencyDelta = current.length - previous.length;

      return {
        subheadline: "Current month versus previous month",
        tableRows: [
          { label: "Spend", value: signedCurrency(spendDelta) },
          { label: "Litres", value: signedNumber(litresDelta, " L") },
          { label: "Efficiency", value: signedNumber(efficiencyDelta, " L/100km") },
          { label: "Transactions", value: signedNumber(frequencyDelta) },
        ],
      };
    },
  }),
];
