import { createStore, del, get, set, type UseStore } from "idb-keyval";
import type { StateStorage } from "zustand/middleware";

/**
 * The persist storage: IndexedDB through idb-keyval. When IndexedDB is not
 * available (private mode, old browser) it falls back to memory and reports
 * it, so the app still works and shows a notice.
 */
export interface SafeStorage extends StateStorage {
  /** Resolves to "persistent" or "memory" after the first access. */
  mode(): Promise<"persistent" | "memory">;
}

export function createSafeStorage(
  dbName = "paleta-musical",
  storeName = "state",
): SafeStorage {
  const memory = new Map<string, string>();
  let store: UseStore | null = null;
  let modePromise: Promise<"persistent" | "memory"> | null = null;

  const mode = () => {
    modePromise ??= (async () => {
      try {
        if (typeof indexedDB === "undefined") return "memory";
        store = createStore(dbName, storeName);
        await set("__probe", "1", store);
        await del("__probe", store);
        return "persistent";
      } catch {
        store = null;
        return "memory";
      }
    })();
    return modePromise;
  };

  return {
    mode,
    async getItem(name) {
      if ((await mode()) === "memory" || !store)
        return memory.get(name) ?? null;
      try {
        return (await get<string>(name, store)) ?? null;
      } catch {
        return memory.get(name) ?? null;
      }
    },
    async setItem(name, value) {
      memory.set(name, value);
      if ((await mode()) === "memory" || !store) return;
      try {
        await set(name, value, store);
      } catch {
        // Quota or a closed database: the memory copy still works.
      }
    },
    async removeItem(name) {
      memory.delete(name);
      if ((await mode()) === "memory" || !store) return;
      try {
        await del(name, store);
      } catch {
        // Nothing to remove.
      }
    },
  };
}

/** Large data (audio buffers, roll notes) goes to its own IndexedDB store, not into the JSON state. */
let blobStore: UseStore | null = null;
function blobs(): UseStore {
  blobStore ??= createStore("paleta-musical-blobs", "blobs");
  return blobStore;
}

export const blobStorage = {
  get: <T>(key: string) => get<T>(key, blobs()),
  set: (key: string, value: unknown) => set(key, value, blobs()),
  delete: (key: string) => del(key, blobs()),
  async clear() {
    const { clear } = await import("idb-keyval");
    await clear(blobs());
  },
};

/** Asks the browser to keep the site data (no-op where the API does not exist). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
