"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "fuel-dashboard-preferences-v1";

export interface DashboardPreferences {
  order: string[];
  hidden: string[];
}

const DEFAULT_PREFERENCES: DashboardPreferences = {
  order: [],
  hidden: [],
};

export function useDashboardPreferences(widgetIds: string[]) {
  const [preferences, setPreferences] =
    useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setLoaded(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<DashboardPreferences>;
      setPreferences({
        order: Array.isArray(parsed.order) ? parsed.order : [],
        hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
      });
    } catch {
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [loaded, preferences]);

  const normalizedOrder = useMemo(() => {
    const current = new Set(widgetIds);
    const ordered = preferences.order.filter((id) => current.has(id));
    const missing = widgetIds.filter((id) => !ordered.includes(id));
    return [...ordered, ...missing];
  }, [preferences.order, widgetIds]);

  const hiddenSet = useMemo(
    () => new Set(preferences.hidden.filter((id) => widgetIds.includes(id))),
    [preferences.hidden, widgetIds]
  );

  function moveWidget(id: string, direction: "up" | "down") {
    setPreferences((current) => {
      const order = [...(current.order.length ? normalizedOrder : widgetIds)];
      const index = order.indexOf(id);
      if (index === -1) return current;

      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= order.length) return current;

      [order[index], order[target]] = [order[target], order[index]];
      return { ...current, order };
    });
  }

  function toggleVisibility(id: string) {
    setPreferences((current) => {
      const hidden = new Set(current.hidden);
      if (hidden.has(id)) {
        hidden.delete(id);
      } else {
        hidden.add(id);
      }
      return { ...current, hidden: Array.from(hidden) };
    });
  }

  function reset() {
    setPreferences(DEFAULT_PREFERENCES);
  }

  return {
    loaded,
    orderedIds: normalizedOrder,
    hiddenSet,
    moveWidget,
    toggleVisibility,
    reset,
  };
}
