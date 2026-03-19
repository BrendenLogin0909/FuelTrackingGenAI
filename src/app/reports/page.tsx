"use client";

import Link from "next/link";
import { DashboardBoard } from "@/components/dashboard/DashboardBoard";
import { Header } from "@/components/layout/Header";
import { PlusIcon } from "@/components/icons";
import { useTransactions } from "@/hooks/useTransactions";

export default function ReportsPage() {
  const { transactions, loading } = useTransactions();

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">Loading your reports...</p>
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
          <div className="mb-8 md:mb-10">
            <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Reports
            </h1>
            <p className="mt-1 text-muted-foreground">
              Explore trends, exceptions, and blocked requirements in one place.
            </p>
          </div>

          <DashboardBoard transactions={transactions} />
        </div>
      </main>
    </>
  );
}
