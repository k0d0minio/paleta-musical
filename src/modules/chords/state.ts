"use client";

import { useMemo } from "react";
import { z } from "zod";
import { useAppStore } from "@/state";
import type { PitchClass } from "@/theory";

/** The Acordes slice (private keys): the selected notes, in selection order. */
const chordsSchema = z.object({
  notes: z
    .array(
      z
        .number()
        .int()
        .min(0)
        .max(11)
        .transform((n) => n as PitchClass),
    )
    .max(12)
    .transform((list) => [...new Set(list)])
    .catch([]),
});

export type ChordsState = z.output<typeof chordsSchema>;

export function parseChordsState(raw: unknown): ChordsState {
  return chordsSchema.parse(raw ?? {});
}

export function useChordsState(): ChordsState {
  const raw = useAppStore((s) => s.modules.chords);
  return useMemo(() => parseChordsState(raw), [raw]);
}

export function getChordsState(): ChordsState {
  return parseChordsState(useAppStore.getState().modules.chords);
}

export function setChordNotes(notes: readonly PitchClass[]): void {
  useAppStore.getState().setModuleState("chords", { notes: [...notes] });
}
