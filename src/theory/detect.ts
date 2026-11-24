import { Chord as TonalChord } from "tonal";
import {
  CHORD_TYPES,
  chordPitchClasses,
  getChordType,
  type ChordRef,
  type ChordTypeId,
} from "./chords";
import { SHARP_LETTERS } from "./names";
import { PITCH_CLASSES, toPitchClass, type PitchClass } from "./pitch";

/** One R10 result: a chord type on a root that holds every selected note. */
export interface ChordMatch {
  readonly root: PitchClass;
  readonly type: ChordTypeId;
  /** True when the chord pitch classes equal the selection. */
  readonly exact: boolean;
  /** The distinct pitch classes of the chord, root first. */
  readonly pcs: readonly PitchClass[];
}

/** Sharp letter names in ASCII, for the alphabetical root order of R10. */
const ROOT_SORT_NAMES = SHARP_LETTERS.map((n) => n.replace("♯", "#"));

function distinct(notes: readonly PitchClass[]): PitchClass[] {
  return [...new Set(notes.map((n) => toPitchClass(n)))];
}

/**
 * R10 chord detection (Acordes module and the builder Detetar mode).
 * - Needs 2 or more distinct notes; else the result is empty.
 * - For each chord type (R4) and each root: every selected note must be a
 *   chord pitch class. Exact: the chord pitch classes equal the selection.
 *   Partial: not exact, and the type has more intervals than the selection
 *   has notes.
 * - Order: exact before partial, then fewer intervals first, then the root
 *   name alphabetically (C♯ sorts as "C#"), then the R4 order.
 */
export function detectChords(notes: readonly PitchClass[]): ChordMatch[] {
  const selection = distinct(notes);
  if (selection.length < 2) return [];
  const out: (ChordMatch & { intervals: number; order: number })[] = [];
  CHORD_TYPES.forEach((type, order) => {
    for (const root of PITCH_CLASSES) {
      const pcs = chordPitchClasses(root, type.id);
      if (!selection.every((n) => pcs.includes(n))) continue;
      const exact = pcs.length === selection.length;
      if (!exact && type.intervals.length <= selection.length) continue;
      out.push({
        root,
        type: type.id,
        exact,
        pcs,
        intervals: type.intervals.length,
        order,
      });
    }
  });
  out.sort(
    (a, b) =>
      Number(b.exact) - Number(a.exact) ||
      a.intervals - b.intervals ||
      ROOT_SORT_NAMES[a.root].localeCompare(ROOT_SORT_NAMES[b.root], "en") ||
      a.order - b.order,
  );
  return out.map(({ root, type, exact, pcs }) => ({ root, type, exact, pcs }));
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
  return TonalChord.detect(selection.map((pc) => ROOT_SORT_NAMES[pc])).map(
    (name) =>
      name
        // tonal writes a plain major triad as "CM"; the app writes "C".
        .replace(/^([A-G][#b]?)M(?=\/|$)/, "$1")
        .replace(/#/g, "♯")
        .replace(/(?<=[A-G0-9m])b/g, "♭"),
  );
}
