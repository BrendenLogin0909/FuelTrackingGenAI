"use client";

import Link from "next/link";
import { useTransactions } from "@/hooks/useTransactions";
import { useMetrics } from "@/hooks/useMetrics";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { Header } from "@/components/layout/Header";
import {
  PlusIcon,
  GaugeIcon,
  ChartIcon,
  DollarIcon,
  FuelIcon,
  DashboardIcon,
  HistoryIcon,
} from "@/components/icons";

export default function DashboardPage() {
  const { transactions, loading } = useTransactions();
  const { latest, averageEfficiency } = useMetrics(transactions);

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">Loading your data...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header
        action={
          <Link
            href="/add"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 md:px-4"
          >
            <PlusIcon size={16} />
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </Link>
        }
      />

      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
          {/* Hero Section */}
          <div className="mb-8 md:mb-10">
            <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Your Fuel Dashboard
            </h1>
            <p className="mt-1 text-muted-foreground">
              Track efficiency, costs, and patterns at a glance.
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="mb-8 grid grid-cols-2 gap-3 md:mb-10 md:grid-cols-4 md:gap-4">
            <MetricCard
              label="Latest Efficiency"
              value={
                latest.litresPer100km != null
                  ? latest.litresPer100km.toFixed(1)
                  : null
              }
              unit=" L/100km"
              icon={<GaugeIcon size={18} />}
            />
            <MetricCard
              label="Average Efficiency"
              value={
                averageEfficiency != null ? averageEfficiency.toFixed(1) : null
              }
              unit=" L/100km"
              icon={<ChartIcon size={18} />}
            />
            <MetricCard
              label="Cost Per KM"
              value={
                latest.costPerKm != null ? `$${latest.costPerKm.toFixed(2)}` : null
              }
              icon={<DollarIcon size={18} />}
            />
            <MetricCard
              label="Last Fill"
              value={
                latest.litresPerTank != null
                  ? `${latest.litresPerTank.toFixed(1)} L`
                  : null
              }
              icon={<FuelIcon size={18} />}
            />
          </div>

          {/* Transactions Section */}
          <RecentTransactions transactions={transactions} />

          {/* Mobile Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-xl md:hidden">
            <div className="mx-auto flex max-w-lg items-center justify-around py-2">
              <Link
                href="/"
                className="flex flex-col items-center gap-1 px-4 py-2 text-primary"
              >
                <DashboardIcon size={20} />
                <span className="text-xs font-medium">Dashboard</span>
              </Link>
              <Link
                href="/add"
                className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <PlusIcon size={20} />
                </div>
              </Link>
              <Link
                href="/transactions"
                className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <HistoryIcon size={20} />
                <span className="text-xs font-medium">History</span>
              </Link>
            </div>
          </nav>

          {/* Bottom padding for mobile nav */}
          <div className="h-20 md:hidden" />
        </div>
      </main>
    </>
  );
}
