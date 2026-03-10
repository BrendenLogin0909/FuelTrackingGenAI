import Dexie, { type Table } from "dexie";
import type { FuelTransaction } from "../types/transaction";
import type { StorageAdapter } from "./types";

const DB_NAME = "FuelTrackingDB";
const STORE_NAME = "transactions";

class FuelTrackingDatabase extends Dexie {
  transactions!: Table<FuelTransaction, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      transactions: "id, date, created_at",
    });
  }
}

const db = new FuelTrackingDatabase();

export class IndexedDBStorageAdapter implements StorageAdapter {
  async getAll(): Promise<FuelTransaction[]> {
    const list = await db.transactions.toArray();
    return list.sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  async getById(id: string): Promise<FuelTransaction | undefined> {
    return db.transactions.get(id);
  }

  async save(transaction: FuelTransaction): Promise<void> {
    const now = new Date().toISOString();
    const toSave = {
      ...transaction,
      updated_at: now,
      created_at: transaction.created_at ?? now,
    };
    await db.transactions.put(toSave);
  }

  async delete(id: string): Promise<void> {
    await db.transactions.delete(id);
  }
}
