import { z } from "zod";
import {
  CHORD_TYPE_IDS,
  OCTAVE_MAX,
  OCTAVE_MIN,
  type ChordTypeId,
  type PitchClass,
  SCALE_IDS,
  type ScaleId,
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

const scaleId = z.enum(SCALE_IDS as [ScaleId, ...ScaleId[]]);
/** Module slices are loose: the shared keys are checked here, each module checks its own keys. */
const moduleSlice = z.looseObject({});

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
    palette: z.looseObject({ tonic: pitchClass, scale: scaleId }),
    progressions: z.looseObject({ key: pitchClass, scale: scaleId }),
    endless: z.looseObject({ key: pitchClass, scale: scaleId }),
    chords: moduleSlice,
    harmony: z.looseObject({ tonic: pitchClass }),
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
