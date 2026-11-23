import { toPitchClass, type PitchClass } from "./pitch";

/**
 * R4: the app's 24 chord types, in the app's own order. `symbol` is the chord
 * symbol suffix shown after the root (music notation, not UI copy). `tonal` is
 * the matching tonal chord-type symbol, or null when tonal has no equivalent
 * (the R4 "#11" type keeps a flat fifth). A unit test checks the intervals.
 */
export const CHORD_TYPES = [
  { id: "major", intervals: [0, 4, 7], symbol: "", tonal: "M" },
  { id: "minor", intervals: [0, 3, 7], symbol: "m", tonal: "m" },
  { id: "dom7", intervals: [0, 4, 7, 10], symbol: "7", tonal: "7" },
  { id: "maj7", intervals: [0, 4, 7, 11], symbol: "maj7", tonal: "maj7" },
  { id: "min7", intervals: [0, 3, 7, 10], symbol: "m7", tonal: "m7" },
  { id: "dim", intervals: [0, 3, 6], symbol: "°", tonal: "dim" },
  { id: "dim7", intervals: [0, 3, 6, 9], symbol: "°7", tonal: "dim7" },
  { id: "aug", intervals: [0, 4, 8], symbol: "+", tonal: "aug" },
  { id: "sus2", intervals: [0, 2, 7], symbol: "sus2", tonal: "sus2" },
  { id: "sus4", intervals: [0, 5, 7], symbol: "sus4", tonal: "sus4" },
  { id: "add9", intervals: [0, 4, 7, 14], symbol: "add9", tonal: "Madd9" },
  { id: "mAdd9", intervals: [0, 3, 7, 14], symbol: "m(add9)", tonal: "madd9" },
  { id: "m6", intervals: [0, 3, 7, 9], symbol: "m6", tonal: "m6" },
  { id: "dom9", intervals: [0, 4, 7, 10, 14], symbol: "9", tonal: "9" },
  { id: "m9", intervals: [0, 3, 7, 10, 14], symbol: "m9", tonal: "m9" },
  { id: "maj9", intervals: [0, 4, 7, 11, 14], symbol: "maj9", tonal: "maj9" },
  { id: "dom7sus4", intervals: [0, 5, 7, 10], symbol: "7sus4", tonal: "7sus4" },
  { id: "halfDim", intervals: [0, 3, 6, 10], symbol: "ø7", tonal: "m7b5" },
  { id: "aug7", intervals: [0, 4, 8, 10], symbol: "+7", tonal: "7#5" },
  { id: "dom7b9", intervals: [0, 4, 7, 10, 13], symbol: "7♭9", tonal: "7b9" },
  { id: "sharp11", intervals: [0, 4, 6, 10, 18], symbol: "7♭5♯11", tonal: null },
  { id: "dom13", intervals: [0, 4, 7, 10, 14, 21], symbol: "13", tonal: "13" },
  { id: "m11", intervals: [0, 3, 7, 10, 14, 17], symbol: "m11", tonal: "m11" },
  { id: "six", intervals: [0, 4, 7, 9], symbol: "6", tonal: "6" },
] as const satisfies readonly {
  id: string;
  intervals: readonly number[];
  symbol: string;
  tonal: string | null;
}[];

export type ChordTypeId = (typeof CHORD_TYPES)[number]["id"];

export interface ChordTypeDef {
  readonly id: ChordTypeId;
  readonly intervals: readonly number[];
  readonly symbol: string;
  readonly tonal: string | null;
}

export const CHORD_TYPE_IDS: readonly ChordTypeId[] = CHORD_TYPES.map((c) => c.id);

export function isChordTypeId(value: unknown): value is ChordTypeId {
  return typeof value === "string" && (CHORD_TYPE_IDS as readonly string[]).includes(value);
}

export function getChordType(id: ChordTypeId): ChordTypeDef {
  const type = CHORD_TYPES.find((c) => c.id === id);
  if (!type) throw new Error(`Unknown chord type: ${id}`);
  return type;
}

/** A chord reference: root, type and inversion (0 = root position). */
export interface ChordRef {
  readonly root: PitchClass;
  readonly type: ChordTypeId;
  readonly inversion: number;
}

/** The distinct pitch classes of a chord, root first, in interval order. */
export function chordPitchClasses(root: PitchClass, type: ChordTypeId): PitchClass[] {
  const out: PitchClass[] = [];
  for (const i of getChordType(type).intervals) {
    const pc = toPitchClass(root + i);
    if (!out.includes(pc)) out.push(pc);
  }
  return out;
}
