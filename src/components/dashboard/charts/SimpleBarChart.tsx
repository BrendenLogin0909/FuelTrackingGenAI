"use client";

import type { ChartPoint } from "@/lib/dashboard/types";

interface SimpleBarChartProps {
  points: ChartPoint[];
}

export function SimpleBarChart({ points }: SimpleBarChartProps) {
  if (points.length === 0) {
    return (
      <div className="rounded-xl bg-secondary/70 p-6 text-sm text-muted-foreground">
        No chart data available.
      </div>
    );
  }

  const max = Math.max(...points.map((point) => point.value), 1);

  return (
    <div className="space-y-3">
      {points.map((point) => (
        <div key={point.label} className="space-y-1">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="truncate text-muted-foreground">{point.label}</span>
            <span className="font-medium text-foreground">
              {point.value.toFixed(1)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max((point.value / max) * 100, 4)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
