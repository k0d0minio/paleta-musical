import { CHORD_TYPES, type ChordRef, type ChordTypeId } from "./chords";
import { toPitchClass, type PitchClass } from "./pitch";
import { SHARP_LETTERS } from "./names";

/** One R10 result: a chord whose pitch classes hold every selected note. */
export interface ChordMatch {
  readonly root: PitchClass;
  readonly type: ChordTypeId;
  /** True when the chord's pitch classes equal the selection. */
  readonly exact: boolean;
  /** The chord's distinct pitch classes, root first, in interval order. */
  readonly pcs: readonly PitchClass[];
}

/**
 * R10: chord detection from notes. Needs 2 or more notes. For every chord
 * type and every root, every selected note must be a chord note. Exact: the
 * chord notes equal the selection. Partial: not exact, and the chord has more
 * intervals than there are selected notes. Order: exact first, then fewer
 * intervals, then the root name A–Z.
 */
export function detectChords(selection: readonly PitchClass[]): ChordMatch[] {
  const selected = [...new Set(selection.map(toPitchClass))];
  if (selected.length < 2) return [];
  const out: (ChordMatch & { size: number })[] = [];
  for (const type of CHORD_TYPES) {
    for (let r = 0; r < 12; r++) {
      const root = r as PitchClass;
      const pcs: PitchClass[] = [];
      for (const iv of type.intervals) {
        const pc = toPitchClass(root + iv);
        if (!pcs.includes(pc)) pcs.push(pc);
      }
      if (!selected.every((pc) => pcs.includes(pc))) continue;
      const exact = pcs.length === selected.length;
      if (!exact && type.intervals.length <= selected.length) continue;
      out.push({
        root,
        type: type.id,
        exact,
        pcs,
        size: type.intervals.length,
      });
    }
  }
  out.sort(
    (a, b) =>
      Number(b.exact) - Number(a.exact) ||
      a.size - b.size ||
      SHARP_LETTERS[a.root].localeCompare(SHARP_LETTERS[b.root]),
  );
  return out.map((m) => ({
    root: m.root,
    type: m.type,
    exact: m.exact,
    pcs: m.pcs,
  }));
}

/** The inversion of a chord type that puts `bass` lowest (0 when `bass` is not a chord note). */
export function inversionForBass(
  root: PitchClass,
  type: ChordTypeId,
  bass: PitchClass,
): number {
  const def = CHORD_TYPES.find((c) => c.id === type);
  if (!def) return 0;
  const sorted = [...def.intervals].sort((a, b) => a - b);
  const index = sorted.findIndex((iv) => toPitchClass(root + iv) === bass);
  return Math.max(0, index);
}

/**
 * Names a set of notes with R10 (fixes U09): the exact match whose root is the
 * bass, else the first exact match, as a chord with the inversion of the bass.
 * Null when no chord matches exactly.
 */
export function nameNotes(
  pcs: readonly PitchClass[],
  bass: PitchClass | undefined = pcs[0],
): ChordRef | null {
  const exact = detectChords(pcs).filter((m) => m.exact);
  const best = exact.find((m) => m.root === bass) ?? exact[0];
  if (!best) return null;
  return {
    root: best.root,
    type: best.type,
    inversion:
      bass === undefined ? 0 : inversionForBass(best.root, best.type, bass),
  };
}
