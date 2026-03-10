import { IndexedDBStorageAdapter } from "./indexeddb-adapter";
import type { StorageAdapter } from "./types";

let storage: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!storage) {
    storage = new IndexedDBStorageAdapter();
  }
  return storage;
}

export { IndexedDBStorageAdapter } from "./indexeddb-adapter";
export type { StorageAdapter } from "./types";
