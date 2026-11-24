import { type ChordRef, type ChordTypeId } from "./chords";
import { FLAT_LETTERS, SHARP_LETTERS, type Spelling } from "./names";
import { toPitchClass, type PitchClass } from "./pitch";

/** R14: the 12 major keys in circle-of-fifths order. */
export const CIRCLE_OF_FIFTHS: readonly PitchClass[] = [
  0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5,
];

export type Accidental = "sharp" | "flat";

export interface KeySignature {
  /** 0–7. */
  readonly count: number;
  readonly accidental: Accidental;
}

/** R14: key signature per major key (pitch class), as the original app shows it. */
const R14_SIGNATURES: Readonly<Record<PitchClass, KeySignature>> = {
  0: { count: 0, accidental: "sharp" },
  7: { count: 1, accidental: "sharp" },
  2: { count: 2, accidental: "sharp" },
  9: { count: 3, accidental: "sharp" },
  4: { count: 4, accidental: "sharp" },
  11: { count: 5, accidental: "sharp" },
  6: { count: 6, accidental: "sharp" },
  1: { count: 7, accidental: "sharp" },
  8: { count: 4, accidental: "flat" },
  3: { count: 3, accidental: "flat" },
  10: { count: 2, accidental: "flat" },
  5: { count: 1, accidental: "flat" },
};

/** R14: the relative minor of a major key (a minor third below). */
export function relativeMinor(major: PitchClass): PitchClass {
  return toPitchClass(major + 9);
}

/** The major key a minor key is relative to. */
export function relativeMajor(minor: PitchClass): PitchClass {
  return toPitchClass(minor + 3);
}

/** The dominant: the next key clockwise (F187). */
export function dominantOf(tonic: PitchClass): PitchClass {
  return toPitchClass(tonic + 7);
}

/** The subdominant: the previous key (F187). */
export function subdominantOf(tonic: PitchClass): PitchClass {
  return toPitchClass(tonic + 5);
}

/** The position (0–11) of a major key on the circle, C = 0, clockwise. */
export function circleIndex(major: PitchClass): number {
  return CIRCLE_OF_FIFTHS.indexOf(major);
}

/** The key `steps` positions clockwise (negative: counter-clockwise). */
export function circleStep(major: PitchClass, steps: number): PitchClass {
  const index = (((circleIndex(major) + steps) % 12) + 12) % 12;
  return CIRCLE_OF_FIFTHS[index] ?? 0;
}

/**
 * The name of a major key on the circle. With "key" spelling the names follow
 * R14 and its signatures: C♯ (7 ♯), and A♭, E♭, B♭, F on the flat side.
 */
export function majorKeyName(major: PitchClass, spelling: Spelling): string {
  if (spelling === "flats") return FLAT_LETTERS[major];
  if (spelling === "sharps") return SHARP_LETTERS[major];
  return R14_SIGNATURES[major].accidental === "flat"
    ? FLAT_LETTERS[major]
    : SHARP_LETTERS[major];
}

/**
 * The name of a minor key. With "key" spelling it takes the accidental of its
 * relative major (F♯m with A, Fm with A♭, A♯m with C♯).
 */
export function minorKeyName(minor: PitchClass, spelling: Spelling): string {
  if (spelling === "flats") return FLAT_LETTERS[minor];
  if (spelling === "sharps") return SHARP_LETTERS[minor];
  return R14_SIGNATURES[relativeMajor(minor)].accidental === "flat"
    ? FLAT_LETTERS[minor]
    : SHARP_LETTERS[minor];
}

export interface SpelledSignature extends KeySignature {
  /** The key name this signature belongs to. */
  readonly keyName: string;
}

/**
 * The key signature of a major key, for the shown name. R14 by default. With
 * "flats" spelling, D♭ and G♭ get their own flat signatures (5 ♭, 6 ♭) so the
 * signature matches the name; other names keep the R14 signature, and
 * `keyName` gives the name that signature belongs to.
 */
export function keySignature(
  major: PitchClass,
  spelling: Spelling = "key",
): SpelledSignature {
  const r14 = R14_SIGNATURES[major];
  const keyName = majorKeyName(major, "key");
  if (spelling === "flats" && r14.accidental === "sharp" && r14.count >= 6) {
    return {
      count: 12 - r14.count,
      accidental: "flat",
      keyName: FLAT_LETTERS[major],
    };
  }
  return { ...r14, keyName };
}

/** F192: the role of a major key relative to the tonic. */
export type KeyRole = "tonic" | "dominant" | "subdominant" | "other";

export function keyRole(tonic: PitchClass, major: PitchClass): KeyRole {
  if (major === tonic) return "tonic";
  if (major === dominantOf(tonic)) return "dominant";
  if (major === subdominantOf(tonic)) return "subdominant";
  return "other";
}

export interface RomanChord {
  /** Roman numeral (music notation): I, ii, vii°, V7… */
  readonly roman: string;
  readonly chord: ChordRef;
  /** A chromatic or added-tension chord (shown with the tension mark). */
  readonly tension?: boolean;
}

const chord = (
  root: number,
  type: ChordTypeId,
  roman: string,
  tension?: boolean,
): RomanChord => ({
  roman,
  chord: { root: toPitchClass(root), type, inversion: 0 },
  ...(tension ? { tension } : {}),
});

/** F198, R5: the 7 diatonic triads of a major key. */
export function majorDiatonicTriads(tonic: PitchClass): RomanChord[] {
  return [
    chord(tonic, "major", "I"),
    chord(tonic + 2, "minor", "ii"),
    chord(tonic + 4, "minor", "iii"),
    chord(tonic + 5, "major", "IV"),
    chord(tonic + 7, "major", "V"),
    chord(tonic + 9, "minor", "vi"),
    chord(tonic + 11, "dim", "vii°"),
  ];
}

/** R5 (Menor Natural): the 7 diatonic triads of a minor key. */
export function minorDiatonicTriads(tonic: PitchClass): RomanChord[] {
  return [
    chord(tonic, "minor", "i"),
    chord(tonic + 2, "dim", "ii°"),
    chord(tonic + 3, "major", "III"),
    chord(tonic + 5, "minor", "iv"),
    chord(tonic + 7, "minor", "v"),
    chord(tonic + 8, "major", "VI"),
    chord(tonic + 10, "major", "VII"),
  ];
}

/** F197: the neighbour chords IV, V and vi. */
export function neighbourChords(tonic: PitchClass): RomanChord[] {
  return [
    chord(tonic + 5, "major", "IV"),
    chord(tonic + 7, "major", "V"),
    chord(tonic + 9, "minor", "vi"),
  ];
}

export const CADENCE_IDS = ["perfect", "plagal", "jazz", "pop"] as const;
export type CadenceId = (typeof CADENCE_IDS)[number];

/** F199, F200, R14: the four cadences. Only V in ii–V–I is a dominant 7th. */
export function cadence(id: CadenceId, tonic: PitchClass): RomanChord[] {
  switch (id) {
    case "perfect":
      return [chord(tonic + 7, "major", "V"), chord(tonic, "major", "I")];
    case "plagal":
      return [chord(tonic + 5, "major", "IV"), chord(tonic, "major", "I")];
    case "jazz":
      return [
        chord(tonic + 2, "minor", "ii"),
        chord(tonic + 7, "dom7", "V7"),
        chord(tonic, "major", "I"),
      ];
    case "pop":
      return [
        chord(tonic, "major", "I"),
        chord(tonic + 9, "minor", "vi"),
        chord(tonic + 5, "major", "IV"),
        chord(tonic + 7, "major", "V"),
      ];
  }
}

/** F200: cadence chords are 1.3 s apart, each marked for 1.1 s. */
export const CADENCE_SPACING_SECONDS = 1.3;
export const CADENCE_MARK_SECONDS = 1.1;

/** F203: I–IV–V–I, four major triads. */
export function oneFourFiveOne(tonic: PitchClass): RomanChord[] {
  return [
    chord(tonic, "major", "I"),
    chord(tonic + 5, "major", "IV"),
    chord(tonic + 7, "major", "V"),
    chord(tonic, "major", "I"),
  ];
}

/** F204: ii (minor), V (dominant 7th, tension), I (major). */
export function twoFiveOne(tonic: PitchClass): RomanChord[] {
  return [
    chord(tonic + 2, "minor", "ii"),
    chord(tonic + 7, "dom7", "V7", true),
    chord(tonic, "major", "I"),
  ];
}
