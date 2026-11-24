import { OCTAVE_DEFAULT, type PitchClass, type ScaleId } from "@/theory";
import {
  DEFAULT_LOCALE,
  type LastChord,
  type ProgressionItem,
  type Settings,
} from "./types";

export const DEFAULT_SETTINGS: Settings = {
  locale: DEFAULT_LOCALE,
  theme: "system",
  noteNames: "both",
  spelling: "sharps",
  instrument: "triangle",
  volume: 0.8,
  motion: "system",
};

/**
 * The keys that more than one module reads or writes (root sync F018, F019;
 * "use this scale" F222). Each module adds its own private keys next to them
 * and validates those itself (the store keeps module slices as loose objects).
 */
export interface SharedModuleKeys {
  palette: { tonic: PitchClass; scale: ScaleId };
  progressions: { key: PitchClass; scale: ScaleId };
  endless: { key: PitchClass; scale: ScaleId };
  chords: Record<never, never>;
  harmony: { tonic: PitchClass };
  analyse: Record<never, never>;
}

export type ModuleSlices = {
  [K in keyof SharedModuleKeys]: SharedModuleKeys[K] & Record<string, unknown>;
};

/** R2 defaults of the shared keys. */
export function defaultModules(): ModuleSlices {
  return {
    palette: { tonic: 0, scale: "major" },
    progressions: { key: 0, scale: "major" },
    endless: { key: 0, scale: "naturalMinor" },
    chords: {},
    harmony: { tonic: 0 },
    analyse: {},
  };
}

/** The persisted part of the store. */
export interface PersistedData {
  global: {
    octave: number;
    lastChord: LastChord | null;
    settings: Settings;
  };
  timeline: { items: ProgressionItem[] };
  builderLine: { items: ProgressionItem[] };
  modules: ModuleSlices;
}

export function defaultData(): PersistedData {
  return {
    global: {
      octave: OCTAVE_DEFAULT,
      lastChord: null,
      settings: { ...DEFAULT_SETTINGS },
    },
    timeline: { items: [] },
    builderLine: { items: [] },
    modules: defaultModules(),
  };
}
