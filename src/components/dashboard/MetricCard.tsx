"use client";

interface MetricCardProps {
  label: string;
  value: string | number | null;
  unit?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}

export function MetricCard({ label, value, unit, icon, trend }: MetricCardProps) {
  const display = value === null || value === undefined ? "---" : `${value}${unit ?? ""}`;
  
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 md:p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground md:text-sm">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-tight text-card-foreground md:text-3xl">
            {display}
          </p>
        </div>
        {icon && (
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1">
          {trend === "up" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          )}
          {trend === "down" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-destructive"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          )}
          <span className={`text-xs ${trend === "up" ? "text-primary" : trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
            vs last fill
          </span>
        </div>
      )}
      <div className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-primary/5 transition-transform group-hover:scale-150" />
    </div>
  );
}
