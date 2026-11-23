import { OCTAVE_DEFAULT } from "@/theory";
import { DEFAULT_LOCALE, type LastChord, type ProgressionItem, type Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  locale: DEFAULT_LOCALE,
  theme: "system",
  noteNames: "both",
  spelling: "sharps",
  instrument: "triangle",
  volume: 0.8,
  motion: "system",
};

/** The persisted part of the store. Module slices start empty: each module ticket fills its own. */
export interface PersistedData {
  global: {
    octave: number;
    lastChord: LastChord | null;
    settings: Settings;
  };
  timeline: { items: ProgressionItem[] };
  builderLine: { items: ProgressionItem[] };
  modules: {
    palette: Record<string, unknown>;
    progressions: Record<string, unknown>;
    endless: Record<string, unknown>;
    chords: Record<string, unknown>;
    harmony: Record<string, unknown>;
    analyse: Record<string, unknown>;
  };
}

export function defaultData(): PersistedData {
  return {
    global: { octave: OCTAVE_DEFAULT, lastChord: null, settings: { ...DEFAULT_SETTINGS } },
    timeline: { items: [] },
    builderLine: { items: [] },
    modules: { palette: {}, progressions: {}, endless: {}, chords: {}, harmony: {}, analyse: {} },
  };
}
