"use client";

import { useMemo } from "react";
import { z } from "zod";
import { useAppStore, type ProgressionItem } from "@/state";
import {
  BPM_MAX,
  BPM_MIN,
  CHORD_TYPE_IDS,
  RHYTHM_DEFAULTS,
  RHYTHM_IDS,
  SCALE_IDS,
  STYLE_IDS,
  isChordTypeId,
  isPitchClass,
  type ChordTypeId,
  type PitchClass,
  type RhythmId,
  type RhythmOptions,
  type ScaleId,
  type StyleId,
} from "@/theory";

const pc = z
  .number()
  .refine((n) => isPitchClass(n))
  .transform((n) => n as PitchClass);
const bpm = z.number().int().min(BPM_MIN).max(BPM_MAX);
const rhythm = z.enum(RHYTHM_IDS as unknown as [RhythmId, ...RhythmId[]]);

/** The progressions module slice (R2 defaults). Invalid fields fall back to their default. */
export const progressionsSchema = z.object({
  key: pc.catch(0),
  scale: z.enum(SCALE_IDS as unknown as [ScaleId, ...ScaleId[]]).catch("major"),
  style: z.enum(STYLE_IDS as unknown as [StyleId, ...StyleId[]]).catch("pop"),
  rhythm: rhythm.catch("simples"),
  bpm: bpm.catch(90),
  swing: z.number().min(0.5).max(0.75).catch(RHYTHM_DEFAULTS.swing),
  strumMs: z.number().min(10).max(120).catch(RHYTHM_DEFAULTS.strumMs),
  repeats: z.number().int().min(1).max(8).catch(RHYTHM_DEFAULTS.repeats),
  arpNoteMs: z.number().min(30).max(200).nullable().catch(null),
  builderMode: z.enum(["list", "detect"]).catch("list"),
  builderTonic: pc.catch(0),
  builderType: z
    .string()
    .refine((v) => isChordTypeId(v))
    .transform((v) => v as ChordTypeId)
    .catch("major"),
  builderRhythm: rhythm.catch("simples"),
  builderBpm: bpm.catch(90),
  timelineRhythm: rhythm.catch("simples"),
  timelineBpm: bpm.catch(90),
  timelineLoop: z.boolean().catch(false),
});

export type ProgressionsState = z.infer<typeof progressionsSchema>;

export function parseProgressionsState(raw: unknown): ProgressionsState {
  return progressionsSchema.parse(raw ?? {});
}

export function useProgressionsState(): ProgressionsState {
  const raw = useAppStore((s) => s.modules.progressions);
  return useMemo(() => parseProgressionsState(raw), [raw]);
}

export function setProgressions(patch: Partial<ProgressionsState>): void {
  useAppStore.getState().setModuleState("progressions", patch);
}

/** The swing, strum and repeat values come from the Estilos settings (F134). */
export function rhythmOptions(
  s: ProgressionsState,
  bpmValue: number,
): RhythmOptions {
  return {
    bpm: bpmValue,
    swing: s.swing,
    strumMs: s.strumMs,
    repeats: s.repeats,
    arpNoteMs: s.arpNoteMs,
  };
}

export function useTimelineItems(): ProgressionItem[] {
  return useAppStore((s) => s.timeline.items);
}

export function useBuilderItems(): ProgressionItem[] {
  return useAppStore((s) => s.builderLine.items);
}

export { CHORD_TYPE_IDS };
