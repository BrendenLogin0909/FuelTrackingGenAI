"use client";

import Link from "next/link";
import type { FuelTransaction } from "@/lib/types/transaction";

interface RecentTransactionsProps {
  transactions: FuelTransaction[];
  maxDisplay?: number;
}

export function RecentTransactions({
  transactions,
  maxDisplay = 5,
}: RecentTransactionsProps) {
  const list = [...transactions]
    .sort((a, b) => {
      const dateDelta = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDelta !== 0) {
        return dateDelta;
      }
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    })
    .slice(0, maxDisplay);

  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center md:p-12">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </div>
        <h3 className="mb-1 text-lg font-medium text-foreground">No transactions yet</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Start tracking your fuel purchases to see insights here.
        </p>
        <Link
          href="/add"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
          Add your first transaction
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 md:px-5">
        <h2 className="font-semibold text-card-foreground">Recent Transactions</h2>
        {transactions.length > maxDisplay && (
          <Link
            href="/transactions"
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            View all
          </Link>
        )}
      </div>
      <ul className="divide-y divide-border">
        {list.map((tx) => (
          <li key={tx.id}>
            <Link
              href={`/transactions/${tx.id}`}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-secondary/50 md:px-5 md:py-4"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 md:h-12 md:w-12">
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
                  className="text-primary"
                >
                  <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-card-foreground">
                    {formatDate(tx.date)}
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
                className="flex-shrink-0 text-muted-foreground"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
