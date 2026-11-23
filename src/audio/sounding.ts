import { useSyncExternalStore } from "react";
import type { PitchClass } from "@/theory";

/**
 * The sounding-note bus (F011–F013). It lives outside the store: every played
 * note sends a mark with a duration, and each shown note subscribes to its own
 * pitch class only, so a mark re-renders that one note and nothing else.
 */
const counts: number[] = new Array<number>(12).fill(0);
const listeners: Set<() => void>[] = Array.from({ length: 12 }, () => new Set());
const timers = new Set<ReturnType<typeof setTimeout>>();

function notify(pc: PitchClass) {
  for (const listener of listeners[pc] ?? []) listener();
}

export function markSounding(pcs: readonly PitchClass[], seconds: number): void {
  const unique = [...new Set(pcs)];
  for (const pc of unique) {
    counts[pc] = (counts[pc] ?? 0) + 1;
    if (counts[pc] === 1) notify(pc);
  }
  const timer = setTimeout(() => {
    timers.delete(timer);
    for (const pc of unique) {
      counts[pc] = Math.max(0, (counts[pc] ?? 0) - 1);
      if (counts[pc] === 0) notify(pc);
    }
  }, seconds * 1000);
  timers.add(timer);
}

export function isSounding(pc: PitchClass): boolean {
  return (counts[pc] ?? 0) > 0;
}

export function subscribeSounding(pc: PitchClass, listener: () => void): () => void {
  listeners[pc]?.add(listener);
  return () => listeners[pc]?.delete(listener);
}

/** Removes every mark at once (stop-all). */
export function clearSounding(): void {
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  for (let pc = 0; pc < 12; pc++) {
    if ((counts[pc] ?? 0) > 0) {
      counts[pc] = 0;
      notify(pc as PitchClass);
    }
  }
}

/** True while the pitch class is marked as sounding. */
export function useSounding(pc: PitchClass): boolean {
  return useSyncExternalStore(
    (listener) => subscribeSounding(pc, listener),
    () => isSounding(pc),
    () => false,
  );
}
