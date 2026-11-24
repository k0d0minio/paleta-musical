"use client";

import { useSyncExternalStore } from "react";

/**
 * The decoded audio file of the analyse module (JAM-551 writes it, the piano
 * roll of JAM-552 reads it: "the roll does not decode again"). An AudioBuffer
 * is not data for the persisted store, so it lives in this small external
 * store, in memory for the session. A module outside `analyse` reads it
 * through `@/modules/analyse` only.
 */
export interface DecodedFile {
  readonly name: string;
  readonly sizeBytes: number;
  readonly buffer: AudioBuffer;
}

let current: DecodedFile | null = null;
const listeners = new Set<() => void>();

export function setDecodedFile(file: DecodedFile | null): void {
  current = file;
  for (const l of listeners) l();
}

export function getDecodedFile(): DecodedFile | null {
  return current;
}

export function subscribeDecodedFile(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDecodedFile(): DecodedFile | null {
  return useSyncExternalStore(subscribeDecodedFile, getDecodedFile, () => null);
}
