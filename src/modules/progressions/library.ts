"use client";

import { createStore, get, set, type UseStore } from "idb-keyval";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { newId } from "@/state";
import {
  decodeProgression,
  encodeProgression,
  type ProgressionData,
} from "./share";

/** A saved progression of the local library (IndexedDB, idb-keyval). */
export interface SavedProgression {
  readonly id: string;
  readonly name: string;
  readonly updatedAt: number;
  readonly data: ProgressionData;
}

// Stored with the compact share encoding, so the library and links share one format and one validator.
const storedSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string().max(120),
    updatedAt: z.number(),
    data: z.string(),
  }),
);

const KEY = "progressions";
let store: UseStore | null = null;
let memory: SavedProgression[] = [];
const listeners = new Set<(items: SavedProgression[]) => void>();

function idb(): UseStore | null {
  if (typeof indexedDB === "undefined") return null;
  store ??= createStore("paleta-musical-library", "items");
  return store;
}

export async function loadLibrary(): Promise<{
  items: SavedProgression[];
  available: boolean;
}> {
  const db = idb();
  if (!db) return { items: memory, available: false };
  try {
    const raw = await get<unknown>(KEY, db);
    const parsed = storedSchema.safeParse(raw ?? []);
    if (!parsed.success) return { items: [], available: true };
    memory = parsed.data.flatMap((e) => {
      const data = decodeProgression(e.data);
      return data
        ? [{ id: e.id, name: e.name, updatedAt: e.updatedAt, data }]
        : [];
    });
    return { items: memory, available: true };
  } catch {
    return { items: memory, available: false };
  }
}

async function persist(items: SavedProgression[]): Promise<void> {
  memory = items;
  for (const l of listeners) l(items);
  const db = idb();
  if (!db) return;
  try {
    await set(
      KEY,
      items.map((i) => ({
        id: i.id,
        name: i.name,
        updatedAt: i.updatedAt,
        data: encodeProgression(i.data),
      })),
      db,
    );
  } catch {
    // The library stays in memory for this session.
  }
}

export function saveProgression(name: string, data: ProgressionData) {
  const item: SavedProgression = {
    id: newId(),
    name,
    updatedAt: Date.now(),
    data,
  };
  return persist([item, ...memory]).then(() => item);
}

export function renameProgression(id: string, name: string) {
  return persist(
    memory.map((i) =>
      i.id === id ? { ...i, name, updatedAt: Date.now() } : i,
    ),
  );
}

export function duplicateProgression(id: string, name: string) {
  const source = memory.find((i) => i.id === id);
  if (!source) return Promise.resolve();
  const copy: SavedProgression = {
    ...source,
    id: newId(),
    name,
    updatedAt: Date.now(),
  };
  const index = memory.indexOf(source);
  return persist([
    ...memory.slice(0, index + 1),
    copy,
    ...memory.slice(index + 1),
  ]);
}

export function deleteProgression(id: string) {
  return persist(memory.filter((i) => i.id !== id));
}

export function useLibrary() {
  const [state, setState] = useState<{
    items: SavedProgression[];
    available: boolean;
    ready: boolean;
  }>({ items: [], available: true, ready: false });
  useEffect(() => {
    let alive = true;
    void loadLibrary().then((r) => {
      if (alive) setState({ ...r, ready: true });
    });
    const listener = (items: SavedProgression[]) =>
      setState((s) => ({ ...s, items }));
    listeners.add(listener);
    return () => {
      alive = false;
      listeners.delete(listener);
    };
  }, []);
  const reload = useCallback(() => {
    void loadLibrary().then((r) => setState({ ...r, ready: true }));
  }, []);
  return { ...state, reload };
}
