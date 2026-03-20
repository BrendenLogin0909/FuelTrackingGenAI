"use client";

import type { ChartPoint } from "@/lib/dashboard/types";

interface SimpleLineChartProps {
  points: ChartPoint[];
  tone?: "primary" | "warning";
}

export function SimpleLineChart({
  points,
  tone = "primary",
}: SimpleLineChartProps) {
  if (points.length === 0) {
    return (
      <div className="rounded-xl bg-secondary/70 p-6 text-sm text-muted-foreground">
        No chart data available.
      </div>
    );
  }

  const width = 100;
  const height = 42;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const path = points
    .map((point, index) => {
      const x =
        points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - ((point.value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const stroke =
    tone === "warning" ? "hsl(var(--destructive))" : "hsl(var(--primary))";

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${width} ${height + 4}`}
        className="h-28 w-full overflow-visible rounded-xl bg-gradient-to-b from-primary/5 to-transparent p-2"
        preserveAspectRatio="none"
      >
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground md:grid-cols-6">
        {points.slice(-6).map((point) => (
          <div key={point.label} className="rounded-lg bg-secondary/60 px-2 py-1">
            <div>{point.label}</div>
            <div className="font-medium text-foreground">
              {point.value.toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
