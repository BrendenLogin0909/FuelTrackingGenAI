"use client";

import Link from "next/link";
import { useTransactions } from "@/hooks/useTransactions";
import { useMetrics } from "@/hooks/useMetrics";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { Header } from "@/components/layout/Header";

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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
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
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m12 14 4-4" />
                  <path d="M3.34 19a10 10 0 1 1 17.32 0" />
                </svg>
              }
            />
            <MetricCard
              label="Average Efficiency"
              value={
                averageEfficiency != null ? averageEfficiency.toFixed(1) : null
              }
              unit=" L/100km"
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              }
            />
            <MetricCard
              label="Cost Per KM"
              value={
                latest.costPerKm != null ? `$${latest.costPerKm.toFixed(2)}` : null
              }
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                  <path d="M12 18V6" />
                </svg>
              }
            />
            <MetricCard
              label="Last Fill"
              value={
                latest.litresPerTank != null
                  ? `${latest.litresPerTank.toFixed(1)} L`
                  : null
              }
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
                </svg>
              }
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="7" height="9" x="3" y="3" rx="1" />
                  <rect width="7" height="5" x="14" y="3" rx="1" />
                  <rect width="7" height="9" x="14" y="12" rx="1" />
                  <rect width="7" height="5" x="3" y="16" rx="1" />
                </svg>
                <span className="text-xs font-medium">Dashboard</span>
              </Link>
              <Link
                href="/add"
                className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                </div>
              </Link>
              <Link
                href="/transactions"
                className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
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
