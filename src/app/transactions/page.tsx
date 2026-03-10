"use client";

import Link from "next/link";
import { useTransactions } from "@/hooks/useTransactions";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";

export default function TransactionsListPage() {
  const { transactions, loading } = useTransactions();

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="py-12 text-center text-slate-500">Loading…</div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-slate-600 hover:text-slate-800">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold">All transactions</h1>
      </div>
      <RecentTransactions transactions={transactions} maxDisplay={100} />
    </main>
  );
}
