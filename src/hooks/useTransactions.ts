"use client";

import { useState, useEffect, useCallback } from "react";
import { getStorage } from "@/lib/storage";
import { enrichTransactionsWithMetrics } from "@/lib/calculations";
import type { FuelTransaction } from "@/lib/types/transaction";

export function useTransactions() {
  const [transactions, setTransactions] = useState<FuelTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const storage = getStorage();
    const list = await storage.getAll();
    const enriched = enrichTransactionsWithMetrics(list);
    setTransactions(enriched);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (tx: FuelTransaction) => {
      const storage = getStorage();
      await storage.save(tx);
      await load();
    },
    [load]
  );

  const remove = useCallback(
    async (id: string) => {
      const storage = getStorage();
      await storage.delete(id);
      await load();
    },
    [load]
  );

  const getById = useCallback(async (id: string) => {
    const storage = getStorage();
    return storage.getById(id);
  }, []);

  return {
    transactions,
    loading,
    save,
    remove,
    getById,
    refresh: load,
  };
}
