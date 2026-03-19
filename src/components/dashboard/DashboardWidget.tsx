"use client";

import { SimpleBarChart } from "@/components/dashboard/charts/SimpleBarChart";
import { SimpleLineChart } from "@/components/dashboard/charts/SimpleLineChart";
import type { WidgetDefinition, WidgetRenderData } from "@/lib/dashboard/types";

interface DashboardWidgetProps {
  widget: WidgetDefinition;
  data: WidgetRenderData;
  isHidden: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleHidden: () => void;
}

export function DashboardWidget({
  widget,
  data,
  isHidden,
  onMoveUp,
  onMoveDown,
  onToggleHidden,
}: DashboardWidgetProps) {
  const priorityTone =
    widget.priority === "high"
      ? "text-primary"
      : widget.priority === "medium"
        ? "text-foreground"
        : "text-muted-foreground";

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-border bg-card ${
        widget.size === "wide" ? "lg:col-span-2" : ""
      }`}
    >
      <div className="border-b border-border px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-card-foreground">
                {widget.title}
              </h2>
              <span
                className={`text-[11px] font-medium uppercase tracking-[0.2em] ${priorityTone}`}
              >
                {widget.priority}
              </span>
              {widget.status === "blocked" && (
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-destructive">
                  blocked
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{widget.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              onClick={onMoveUp}
              className="rounded-lg border border-border px-2.5 py-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              Move Up
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              className="rounded-lg border border-border px-2.5 py-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              Move Down
            </button>
            <button
              type="button"
              onClick={onToggleHidden}
              className="rounded-lg border border-border px-2.5 py-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {isHidden ? "Show" : "Hide"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-5">
        {widget.status === "blocked" ? (
          <div className="rounded-xl border border-dashed border-border bg-secondary/35 p-4 text-sm text-muted-foreground">
            {widget.blockedReason}
          </div>
        ) : (
          <>
            {(data.headline || data.subheadline) && (
              <div>
                {data.headline && (
                  <div className="text-2xl font-semibold tracking-tight text-card-foreground">
                    {data.headline}
                  </div>
                )}
                {data.subheadline && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {data.subheadline}
                  </p>
                )}
              </div>
            )}

            {data.points && data.points.length > 0 && widget.size === "wide" ? (
              <SimpleLineChart points={data.points} />
            ) : data.points && data.points.length > 0 ? (
              <SimpleBarChart points={data.points} />
            ) : null}

            {data.tableRows && data.tableRows.length > 0 && (
              <div className="space-y-2">
                {data.tableRows.map((row) => (
                  <div
                    key={`${row.label}-${row.value}`}
                    className="flex items-center justify-between rounded-xl bg-secondary/45 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{row.label}</span>
                    <span
                      className={`font-medium ${
                        row.tone === "good"
                          ? "text-primary"
                          : row.tone === "bad"
                            ? "text-destructive"
                            : "text-foreground"
                      }`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!data.points?.length && !data.tableRows?.length && data.emptyMessage && (
              <div className="rounded-xl bg-secondary/50 p-4 text-sm text-muted-foreground">
                {data.emptyMessage}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
