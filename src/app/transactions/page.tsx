"use client";

import Link from "next/link";
import { useTransactions } from "@/hooks/useTransactions";
import { Header } from "@/components/layout/Header";
import { PlusIcon, FuelIcon, ChevronRightIcon } from "@/components/icons";
import type { FuelTransaction } from "@/lib/types/transaction";

export default function TransactionsListPage() {
  const { transactions, loading } = useTransactions();

  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateDelta = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDelta !== 0) return dateDelta;
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });

  // Group transactions by month
  const groupedTransactions = sortedTransactions.reduce((groups, tx) => {
    const date = new Date(tx.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!groups[key]) {
      groups[key] = {
        label: date.toLocaleDateString("en-AU", { month: "long", year: "numeric" }),
        transactions: [],
        totalSpent: 0,
        totalLitres: 0,
      };
    }
    groups[key].transactions.push(tx);
    if (tx.total_cost) groups[key].totalSpent += tx.total_cost;
    if (tx.litres) groups[key].totalLitres += tx.litres;
    return groups;
  }, {} as Record<string, { label: string; transactions: FuelTransaction[]; totalSpent: number; totalLitres: number }>);

  if (loading) {
    return (
      <>
        <Header title="Transaction History" showBack />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">Loading transactions...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header
        title="Transaction History"
        showBack
        action={
          <Link
            href="/add"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <PlusIcon size={16} />
            <span className="hidden sm:inline">Add</span>
          </Link>
        }
      />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
          {sortedTransactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center md:p-12">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <PlusIcon size={24} className="text-primary" />
              </div>
              <h3 className="mb-1 text-lg font-medium text-foreground">No transactions yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Start tracking your fuel purchases to see your history here.
              </p>
              <Link
                href="/add"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Add your first transaction
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTransactions).map(([key, group]) => (
                <div key={key}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </h2>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>${group.totalSpent.toFixed(2)} spent</span>
                      <span>{group.totalLitres.toFixed(1)} L</span>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <ul className="divide-y divide-border">
                      {group.transactions.map((tx) => (
                        <li key={tx.id}>
                          <Link
                            href={`/transactions/${tx.id}`}
                            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/50 md:px-5 md:py-4"
                          >
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 md:h-12 md:w-12">
                              <FuelIcon size={20} className="text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-card-foreground">
                                  {new Date(tx.date).toLocaleDateString("en-AU", {
                                    weekday: "short",
                                    day: "numeric",
                                  })}
                                </span>
                                {tx.fuel_type && (
                                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                    {tx.fuel_type}
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-sm text-muted-foreground">
                                {tx.station_name || "Unknown station"}
                                {tx.litres && ` • ${tx.litres.toFixed(1)}L`}
                              </p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              {tx.total_cost != null ? (
                                <p className="font-semibold text-card-foreground">
                                  ${tx.total_cost.toFixed(2)}
                                </p>
                              ) : (
                                <p className="text-muted-foreground">---</p>
                              )}
                              {tx.fuel_efficiency != null && (
                                <p className="text-sm text-primary">
                                  {tx.fuel_efficiency.toFixed(1)} L/100km
                                </p>
                              )}
                            </div>
                            <ChevronRightIcon
                              size={16}
                              className="flex-shrink-0 text-muted-foreground"
                            />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
