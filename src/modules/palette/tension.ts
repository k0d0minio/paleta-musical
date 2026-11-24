"use client";

import { useEffect, useState } from "react";

/** R15: tension items show when the tension value is above 0.45 (F038, F043, F054). */
export const TENSION_THRESHOLD = 0.45;
/** F038: the palette applies the tension marks 80 ms after the last change. */
export const TENSION_MARK_DELAY_MS = 80;

export type TensionLevel = "consonant" | "colourful" | "moderate" | "high";

/** F037: the status text of a tension value. */
export function tensionLevel(value: number): TensionLevel {
  if (value < 0.2) return "consonant";
  if (value < 0.45) return "colourful";
  if (value < 0.7) return "moderate";
  return "high";
}

export function isTense(value: number): boolean {
  return value > TENSION_THRESHOLD;
}

/** A value that follows `value` after `delayMs` without a change. */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
