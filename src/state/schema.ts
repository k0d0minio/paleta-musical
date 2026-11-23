import { z } from "zod";
import {
  CHORD_TYPE_IDS,
  OCTAVE_MAX,
  OCTAVE_MIN,
  type ChordTypeId,
  type PitchClass,
} from "@/theory";
import { LOCALES, MOTION_SETTINGS, THEMES } from "./types";

const pitchClass = z
  .number()
  .int()
  .min(0)
  .max(11)
  .transform((n) => n as PitchClass);

const chordType = z.enum(CHORD_TYPE_IDS as [ChordTypeId, ...ChordTypeId[]]);

const chordRef = z.object({
  root: pitchClass,
  type: chordType,
  inversion: z.number().int().min(0).max(6),
});

const progressionItem = z.object({
  id: z.string().min(1),
  chord: chordRef,
  tension: z.boolean(),
});

export const settingsSchema = z.object({
  locale: z.enum(LOCALES),
  theme: z.enum(THEMES),
  noteNames: z.enum(["letter", "solfege", "both"]),
  spelling: z.enum(["sharps", "flats", "key"]),
  instrument: z.string().min(1),
  volume: z.number().min(0).max(1),
  motion: z.enum(MOTION_SETTINGS),
});

const moduleSlice = z.record(z.string(), z.unknown());

/** The schema of the persisted data, current version. */
export const persistedSchema = z.object({
  global: z.object({
    octave: z.number().int().min(OCTAVE_MIN).max(OCTAVE_MAX),
    lastChord: z
      .object({ pcs: z.array(pitchClass).min(1), chord: chordRef.nullable() })
      .nullable(),
    settings: settingsSchema,
  }),
  timeline: z.object({ items: z.array(progressionItem) }),
  builderLine: z.object({ items: z.array(progressionItem) }),
  modules: z.object({
    palette: moduleSlice,
    progressions: moduleSlice,
    endless: moduleSlice,
    chords: moduleSlice,
    harmony: moduleSlice,
    analyse: moduleSlice,
  }),
});

/** A backup file: the app name, the schema version and the data. */
export const backupSchema = z.object({
  app: z.literal("paleta-musical"),
  version: z.number().int().min(0),
  exportedAt: z.string(),
  data: z.unknown(),
});
