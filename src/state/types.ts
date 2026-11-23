import type {
  ChordRef,
  Note,
  NoteNameStyle,
  PitchClass,
  Spelling,
} from "@/theory";

export type { ChordRef, Note, PitchClass };

/** The six modules. `/analyse/roll` is a view of the analyse module. */
export const MODULE_IDS = [
  "palette",
  "progressions",
  "endless",
  "chords",
  "harmony",
  "analyse",
] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

/** One chord in the shared timeline or in the builder line. */
export interface ProgressionItem {
  readonly id: string;
  readonly chord: ChordRef;
  /** A chromatic or borrowed chord (tension). */
  readonly tension: boolean;
}

/** F022: the last chord: its pitch classes, root first, and its chord when known. */
export interface LastChord {
  readonly pcs: readonly PitchClass[];
  readonly chord: ChordRef | null;
}

export const LOCALES = ["pt-PT", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pt-PT";

export const THEMES = ["system", "light", "dark"] as const;
export type ThemeSetting = (typeof THEMES)[number];

export const MOTION_SETTINGS = ["system", "reduce", "full"] as const;
export type MotionSetting = (typeof MOTION_SETTINGS)[number];

export interface Settings {
  readonly locale: Locale;
  readonly theme: ThemeSetting;
  readonly noteNames: NoteNameStyle;
  readonly spelling: Spelling;
  readonly instrument: string;
  /** Master volume, 0–1. */
  readonly volume: number;
  readonly motion: MotionSetting;
}

export type StorageStatus = "pending" | "persistent" | "memory";
