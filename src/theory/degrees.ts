import { getChordType, type ChordTypeId } from "./chords";
import { toPitchClass, type PitchClass } from "./pitch";
import { getScale, type ScaleId } from "./scales";

const SCALE_DEGREES = [
  "1",
  "♭2",
  "2",
  "♭3",
  "3",
  "4",
  "♯4",
  "5",
  "♭6",
  "6",
  "♭7",
  "7",
] as const;

/**
 * The degree of a pitch class in a scale, as an interval label from the tonic
 * (1, ♭3, 5 …), or null when the note is not in the scale. The tritone is ♭5
 * when the scale also has a 4, else ♯4 (Lídia).
 */
export function scaleDegreeLabel(
  pc: PitchClass,
  tonic: PitchClass,
  scale: ScaleId,
): string | null {
  const intervals = getScale(scale).intervals;
  const iv = toPitchClass(pc - tonic);
  if (!intervals.includes(iv)) return null;
  if (iv === 6) return intervals.includes(5) ? "♭5" : "♯4";
  return SCALE_DEGREES[iv];
}

const CHORD_DEGREES: Record<number, string> = {
  0: "1",
  2: "2",
  3: "♭3",
  4: "3",
  5: "4",
  6: "♭5",
  7: "5",
  8: "♯5",
  9: "6",
  10: "♭7",
  11: "7",
  13: "♭9",
  14: "9",
  15: "♯9",
  17: "11",
  18: "♯11",
  20: "♭13",
  21: "13",
};

/** The chord-tone label of an interval in semitones (1, 3, 5, ♭7, 9 …). */
export function intervalLabel(semitones: number): string {
  return (
    CHORD_DEGREES[semitones] ??
    CHORD_DEGREES[toPitchClass(semitones)] ??
    String(semitones)
  );
}

/** The chord-tone label of a pitch class in a chord, or null when it is not a chord note. */
export function chordDegreeLabel(
  pc: PitchClass,
  root: PitchClass,
  type: ChordTypeId,
): string | null {
  const iv = getChordType(type).intervals.find(
    (i) => toPitchClass(root + i) === pc,
  );
  return iv === undefined ? null : intervalLabel(iv);
}
