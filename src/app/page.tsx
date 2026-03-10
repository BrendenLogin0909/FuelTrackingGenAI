"use client";

import Link from "next/link";
import { useTransactions } from "@/hooks/useTransactions";
import { useMetrics } from "@/hooks/useMetrics";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";

export default function DashboardPage() {
  const { transactions, loading } = useTransactions();
  const { latest, averageEfficiency } = useMetrics(transactions);

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="py-12 text-center text-slate-500">
          Loading…
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fuel Tracking</h1>
        <Link
          href="/add"
          className="rounded-lg bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
        >
          Add transaction
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <MetricCard
          label="Latest efficiency"
          value={
            latest.litresPer100km != null
              ? latest.litresPer100km.toFixed(1)
              : null
          }
          unit=" L/100km"
        />
        <MetricCard
          label="Average efficiency"
          value={
            averageEfficiency != null ? averageEfficiency.toFixed(1) : null
          }
          unit=" L/100km"
        />
        <MetricCard
          label="Cost per km"
          value={
            latest.costPerKm != null ? `$${latest.costPerKm.toFixed(2)}` : null
          }
        />
        <MetricCard
          label="Last tank"
          value={
            latest.litresPerTank != null
              ? `${latest.litresPerTank.toFixed(1)} L`
              : null
          }
        />
      </div>

      <RecentTransactions transactions={transactions} />
    </main>
  );
}
