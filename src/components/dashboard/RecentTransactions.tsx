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
  const list = transactions.slice(0, maxDisplay);

  if (list.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-500">
        <p>No transactions yet.</p>
        <Link
          href="/add"
          className="mt-2 inline-block text-slate-700 underline hover:text-slate-900"
        >
          Add your first transaction
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold">Recent transactions</h2>
      </div>
      <ul className="divide-y divide-slate-100">
        {list.map((tx) => (
          <li key={tx.id}>
            <Link
              href={`/transactions/${tx.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <div>
                <span className="font-medium">
                  {new Date(tx.date).toLocaleDateString()}
                </span>
                {tx.station_name && (
                  <span className="ml-2 text-slate-500">{tx.station_name}</span>
                )}
              </div>
              <div className="text-right">
                {tx.total_cost != null && (
                  <span className="font-medium">${tx.total_cost.toFixed(2)}</span>
                )}
                {tx.fuel_efficiency != null && (
                  <span className="ml-2 text-slate-500 text-sm">
                    {tx.fuel_efficiency.toFixed(1)} L/100km
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {transactions.length > maxDisplay && (
        <div className="border-t border-slate-100 px-4 py-2 text-center">
          <Link
            href="/transactions"
            className="text-sm text-slate-600 hover:text-slate-800"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
