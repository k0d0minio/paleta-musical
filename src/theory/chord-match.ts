import { Chord as TonalChord } from "tonal";
import { getChordType, type ChordRef, type ChordTypeId } from "./chords";
import type { ChordMatch } from "./detect";
import { SHARP_LETTERS } from "./names";
import { toPitchClass, type PitchClass } from "./pitch";

/**
 * Helpers on the R10 results of `detectChords` (./detect): the Acordes and
 * builder lists, slash-chord names and tonal's other names.
 */

const ASCII_NAMES = SHARP_LETTERS.map((n) => n.replace("♯", "#"));

function distinct(notes: readonly PitchClass[]): PitchClass[] {
  return [...new Set(notes.map((n) => toPitchClass(n)))];
}

export interface SplitMatches {
  readonly exact: readonly ChordMatch[];
  readonly partial: readonly ChordMatch[];
  /** Number of partial matches before the limit. */
  readonly partialTotal: number;
}

/**
 * The Acordes split (F176, F177): every exact match, and the first
 * `partialLimit` partial matches (default 16).
 */
export function splitMatches(
  matches: readonly ChordMatch[],
  partialLimit = 16,
): SplitMatches {
  const exact = matches.filter((m) => m.exact);
  const partialAll = matches.filter((m) => !m.exact);
  return {
    exact,
    partial: partialAll.slice(0, partialLimit),
    partialTotal: partialAll.length,
  };
}

/**
 * The builder Detetar list (F105): up to 6 exact matches; when fewer than 3
 * are exact, partial matches fill the list up to 3 results.
 */
export function builderMatches(matches: readonly ChordMatch[]): ChordMatch[] {
  const exact = matches.filter((m) => m.exact).slice(0, 6);
  if (exact.length >= 3) return exact;
  const partial = matches.filter((m) => !m.exact);
  return [...exact, ...partial.slice(0, 3 - exact.length)];
}

/**
 * The inversion of a chord that puts `bass` lowest, in the one inversion
 * model (inversion k moves the k lowest voices up). Null when `bass` is not a
 * chord note.
 */
export function inversionForBass(
  root: PitchClass,
  type: ChordTypeId,
  bass: PitchClass,
): number | null {
  const sorted = [...getChordType(type).intervals].sort((a, b) => a - b);
  const seen = new Set<number>();
  let index = 0;
  for (const iv of sorted) {
    const pc = toPitchClass(root + iv);
    if (seen.has(pc)) continue;
    if (pc === bass) return index;
    seen.add(pc);
    index += 1;
  }
  return null;
}

/** A chord with the bass the user gave: a slash chord when the bass is not the root. */
export interface SlashChord {
  readonly chord: ChordRef;
  /** The bass note, or null in root position. */
  readonly bass: PitchClass | null;
}

export function slashChord(match: ChordMatch, bass: PitchClass): SlashChord {
  if (bass === match.root)
    return {
      chord: { root: match.root, type: match.type, inversion: 0 },
      bass: null,
    };
  const inversion = inversionForBass(match.root, match.type, bass);
  if (inversion === null)
    return {
      chord: { root: match.root, type: match.type, inversion: 0 },
      bass: null,
    };
  return { chord: { root: match.root, type: match.type, inversion }, bass };
}

/**
 * Other chord names of the selection from tonal `Chord.detect` (for example
 * "C/E" for E G C). The first note is the bass.
 */
export function tonalChordNames(notes: readonly PitchClass[]): string[] {
  const selection = distinct(notes);
  if (selection.length < 2) return [];
  return TonalChord.detect(selection.map((pc) => ASCII_NAMES[pc])).map((name) =>
    name
      // tonal writes a plain major triad as "CM"; the app writes "C".
      .replace(/^([A-G][#b]?)M(?=\/|$)/, "$1")
      .replace(/#/g, "♯")
      .replace(/(?<=[A-G0-9m])b/g, "♭"),
  );
}
