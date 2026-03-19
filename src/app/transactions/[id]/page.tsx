"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { useTransactions } from "@/hooks/useTransactions";
import { Header } from "@/components/layout/Header";
import { AlertCircleIcon, BackIcon } from "@/components/icons";
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
      <>
        <Header title="Edit Transaction" showBack />
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <p className="text-sm text-muted-foreground">Loading transaction...</p>
          </div>
        </main>
      </>
    );
  }

  if (!tx) {
    return (
      <>
        <Header title="Transaction Not Found" showBack />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircleIcon size={32} className="text-destructive" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-foreground">Transaction not found</h2>
            <p className="mb-6 text-muted-foreground">
              The transaction you are looking for does not exist or has been deleted.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <BackIcon size={16} />
              Back to dashboard
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Edit Transaction" showBack />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
          <TransactionForm
            initial={tx}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/")}
            onDelete={handleDelete}
          />
        </div>
      </main>
    </>
  );
}
