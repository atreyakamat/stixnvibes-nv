import "server-only";
import { storeMode, supabaseConfig } from "@/lib/env";
import { MemoryStore } from "./memory";
import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

export class StoreUnavailableError extends Error {
  constructor() {
    super("The shop database isn't configured yet.");
  }
}

const g = globalThis as unknown as { __snvStore?: Store };

/** The store for this server process, or null when nothing is configured. */
export function getStoreOrNull(): Store | null {
  if (g.__snvStore) return g.__snvStore;
  const mode = storeMode();
  if (mode === "supabase") {
    const cfg = supabaseConfig()!;
    g.__snvStore = new SupabaseStore(cfg.url, cfg.serviceKey);
  } else if (mode === "demo") {
    g.__snvStore = new MemoryStore();
  } else {
    return null;
  }
  return g.__snvStore;
}

export function getStore(): Store {
  const store = getStoreOrNull();
  if (!store) throw new StoreUnavailableError();
  return store;
}

export { OutOfStockError } from "./types";
export type { Store } from "./types";
