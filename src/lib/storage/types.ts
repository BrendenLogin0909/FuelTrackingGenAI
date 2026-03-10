import type { FuelTransaction } from "../types/transaction";

/**
 * Storage adapter contract - enables swap from IndexedDB to cloud without changing consumers
 */
export interface StorageAdapter {
  getAll(): Promise<FuelTransaction[]>;
  getById(id: string): Promise<FuelTransaction | undefined>;
  save(transaction: FuelTransaction): Promise<void>;
  delete(id: string): Promise<void>;
}
