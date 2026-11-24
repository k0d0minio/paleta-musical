import { CHORD_TYPES, chordPitchClasses, type ChordTypeId } from "./chords";
import { SHARP_LETTERS } from "./names";
import { PITCH_CLASSES, toPitchClass, type PitchClass } from "./pitch";

/** One R10 result: a chord type on a root that holds every selected note. */
export interface ChordMatch {
  readonly root: PitchClass;
  readonly type: ChordTypeId;
  /** True when the chord pitch classes equal the selection. */
  readonly exact: boolean;
  /** The distinct pitch classes of the chord, root first. */
  readonly pcs: PitchClass[];
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
