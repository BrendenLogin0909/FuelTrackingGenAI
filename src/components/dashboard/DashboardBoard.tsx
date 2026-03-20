"use client";

import { useMemo } from "react";
import { DashboardWidget } from "@/components/dashboard/DashboardWidget";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";
import { dashboardWidgets } from "@/lib/dashboard/widgets";
import type { FuelTransaction } from "@/lib/types/transaction";

interface DashboardBoardProps {
  transactions: FuelTransaction[];
}

export function DashboardBoard({ transactions }: DashboardBoardProps) {
  const widgetIds = useMemo(() => dashboardWidgets.map((widget) => widget.id), []);
  const { hiddenSet, moveWidget, orderedIds, reset, toggleVisibility } =
    useDashboardPreferences(widgetIds);

  const orderedWidgets = orderedIds
    .map((id) => dashboardWidgets.find((widget) => widget.id === id))
    .filter((widget): widget is (typeof dashboardWidgets)[number] => Boolean(widget));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card/70 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">
              Customisable Dashboard
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Reorder widgets, hide reports you do not need, and keep the layout
              aligned to the current product look and feel.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            Reset Layout
          </button>
        </div>

        <details className="mt-4 rounded-xl border border-border bg-background/70 p-3">
          <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
            Customise visible reports
          </summary>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {dashboardWidgets.map((widget) => {
              const hidden = hiddenSet.has(widget.id);
              return (
                <label
                  key={widget.id}
                  className="flex items-start gap-3 rounded-xl bg-secondary/45 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!hidden}
                    onChange={() => toggleVisibility(widget.id)}
                  />
                  <span>
                    <span className="block font-medium text-foreground">
                      {widget.title}
                    </span>
                    <span className="text-muted-foreground">{widget.summary}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </details>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {orderedWidgets
          .filter((widget) => !hiddenSet.has(widget.id))
          .map((widget) => (
            <DashboardWidget
              key={widget.id}
              widget={widget}
              data={widget.render({ transactions, now: new Date() })}
              isHidden={false}
              onMoveUp={() => moveWidget(widget.id, "up")}
              onMoveDown={() => moveWidget(widget.id, "down")}
              onToggleHidden={() => toggleVisibility(widget.id)}
            />
          ))}
      </div>
    </div>
  );
}
