"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { useTransactions } from "@/hooks/useTransactions";
import type { FuelTransaction } from "@/lib/types/transaction";

export default function EditTransactionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { getById, save, remove } = useTransactions();
  const [tx, setTx] = useState<FuelTransaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getById(id).then((t) => {
      setTx(t ?? null);
      setLoading(false);
    });
  }, [id, getById]);

  const handleSubmit = async (updated: FuelTransaction) => {
    await save(updated);
    router.push("/");
  };

  const handleDelete = async () => {
    await remove(id);
    router.push("/");
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="py-12 text-center text-slate-500">Loading…</div>
      </main>
    );
  }

  if (!tx) {
    return (
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="py-12 text-center text-slate-500">
          Transaction not found.
        </div>
        <Link href="/" className="block text-center text-slate-600 hover:underline">
          Back to dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-slate-600 hover:text-slate-800">
          ← Back
        </Link>
        <h1 className="text-xl font-semibold">Edit transaction</h1>
      </div>
      <TransactionForm
        initial={tx}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/")}
        onDelete={handleDelete}
      />
    </main>
  );
}
