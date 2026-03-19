import type { FuelTransaction } from "@/lib/types/transaction";

export interface ChartPoint {
  label: string;
  value: number;
  hint?: string;
}

export interface ReportContext {
  transactions: FuelTransaction[];
  now: Date;
}

export interface WidgetRenderData {
  headline?: string;
  subheadline?: string;
  points?: ChartPoint[];
  tableRows?: Array<{
    label: string;
    value: string;
    tone?: "default" | "good" | "bad";
  }>;
  emptyMessage?: string;
}

export interface WidgetDefinition {
  id: string;
  title: string;
  summary: string;
  priority: "high" | "medium" | "low";
  status: "ready" | "blocked";
  blockedReason?: string;
  size?: "wide" | "standard";
  render: (context: ReportContext) => WidgetRenderData;
}
