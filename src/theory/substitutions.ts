import {
  CHORD_TYPES,
  getChordType,
  type ChordRef,
  type ChordTypeId,
} from "./chords";
import { toPitchClass } from "./pitch";

export interface Substitution {
  readonly chord: ChordRef;
  /** Message key of the reason (`modules.progressions.substitutions.<reason>`). */
  readonly reason: string;
  readonly strength: number;
}

/**
 * R12: substitutions for the chord editor, in insertion order with strength.
 * The current chord and duplicates go; stable sort by strength; keep 12.
 */
export function substitutionsFor(current: ChordRef): Substitution[] {
  const intervals = getChordType(current.type).intervals;
  const minorThird = intervals.includes(3);
  const root = current.root;
  const out: Substitution[] = [];
  const add = (
    offset: number,
    type: ChordTypeId,
    reason: string,
    strength: number,
  ) =>
    out.push({
      chord: { root: toPitchClass(root + offset), type, inversion: 0 },
      reason,
      strength,
    });

  add(6, "dom7", "tritoneSub", 4);
  if (intervals[1] === 3) add(3, "major", "relativeMajor", 4);
  else add(9, "minor", "relativeMinor", 4);
  if (!intervals.includes(10) && !intervals.includes(11))
    add(0, minorThird ? "min7" : "maj7", "addSeventh", 3);
  add(0, "sus4", "sus4", 3);
  add(0, "sus2", "sus2", 2);
  if (minorThird) add(0, "major", "parallelMajor", 3);
  else add(0, "minor", "parallelMinor", 3);
  add(-1, "dim", "diminishedSub", 2);
  add(0, "add9", "add9", 2);
  for (const type of CHORD_TYPES) {
    if (!out.some((s) => s.chord.root === root && s.chord.type === type.id))
      add(0, type.id, "sameRoot", 1);
  }

  const seen = new Set<string>([`${root}:${current.type}`]);
  const unique = out.filter((s) => {
    const id = `${s.chord.root}:${s.chord.type}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return unique
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.strength - a.s.strength || a.i - b.i)
    .map(({ s }) => s)
    .slice(0, 12);
}
