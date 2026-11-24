"use client";

import { useMemo } from "react";
import { z } from "zod";
import { useAppStore } from "@/state";
import {
  CHORD_TYPE_IDS,
  SCALE_IDS,
  type ChordTypeId,
  type PitchClass,
  type ScaleId,
} from "@/theory";

export const PALETTE_MODES = ["scale", "chord", "free", "detect"] as const;
export type PaletteMode = (typeof PALETTE_MODES)[number];

const pitchClass = z
  .number()
  .int()
  .min(0)
  .max(11)
  .transform((n) => n as PitchClass);
const notes = z
  .array(pitchClass)
  .max(12)
  .transform((list) => [...new Set(list)]);

/**
 * The Paleta slice: `tonic` and `scale` are shared keys (other modules read
 * them); the rest is private to this module. Each key falls back to its R2
 * default on its own, so one bad key never resets the others.
 */
const paletteSchema = z.object({
  mode: z.enum(PALETTE_MODES).catch("scale"),
  tonic: pitchClass.catch(0 as PitchClass),
  scale: z.enum(SCALE_IDS as [ScaleId, ...ScaleId[]]).catch("major"),
  chordType: z
    .enum(CHORD_TYPE_IDS as [ChordTypeId, ...ChordTypeId[]])
    .catch("major"),
  tension: z.number().min(0).max(1).catch(0.3),
  freeNotes: notes.catch([]),
  detectNotes: notes.catch([]),
  showDegrees: z.boolean().catch(false),
  showStaff: z.boolean().catch(false),
  showGuitar: z.boolean().catch(false),
});

export type PaletteState = z.output<typeof paletteSchema>;

export function parsePaletteState(raw: unknown): PaletteState {
  return paletteSchema.parse(raw ?? {});
}

export function usePaletteState(): PaletteState {
  const raw = useAppStore((s) => s.modules.palette);
  return useMemo(() => parsePaletteState(raw), [raw]);
}

export function getPaletteState(): PaletteState {
  return parsePaletteState(useAppStore.getState().modules.palette);
}

export function setPalette(patch: Partial<PaletteState>): void {
  useAppStore.getState().setModuleState("palette", patch);
}

/** Toggles a note in a selection list, keeping the selection order (F056, F061). */
export function toggleNote(
  list: readonly PitchClass[],
  pc: PitchClass,
): PitchClass[] {
  return list.includes(pc) ? list.filter((n) => n !== pc) : [...list, pc];
}
