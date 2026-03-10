"use client";

interface MetricCardProps {
  label: string;
  value: string | number | null;
  unit?: string;
}

export function MetricCard({ label, value, unit }: MetricCardProps) {
  const display =
    value === null || value === undefined ? "N/A" : `${value}${unit ?? ""}`;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold">{display}</div>
    </div>
  );
}
