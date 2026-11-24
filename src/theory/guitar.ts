import type { ChordTypeId } from "./chords";
import { toPitchClass, type PitchClass } from "./pitch";

/** Standard tuning, low string first (E A D G B E). */
export const GUITAR_TUNING: readonly PitchClass[] = [4, 9, 2, 7, 11, 4];

/** A movable shape: the string that has the root (6, 5 or 4) and the frets of the 6 strings relative to the root fret (null = muted). */
interface Shape {
  readonly rootString: 6 | 5 | 4;
  readonly frets: readonly (number | null)[];
}

const x = null;
/** E shape: root on the 6th string. A shape: root on the 5th. D shape: root on the 4th. */
const E = (frets: (number | null)[]): Shape => ({ rootString: 6, frets });
const A = (frets: (number | null)[]): Shape => ({ rootString: 5, frets });
const D = (frets: (number | null)[]): Shape => ({ rootString: 4, frets });

/**
 * The small app table of guitar voicings (movable shapes). A type that is
 * not in the table shows no diagram. Each shape is checked by a unit test:
 * it sounds only chord notes, with the root in the bass.
 */
const SHAPES: Partial<Record<ChordTypeId, readonly Shape[]>> = {
  major: [E([0, 2, 2, 1, 0, 0]), A([x, 0, 2, 2, 2, 0])],
  minor: [E([0, 2, 2, 0, 0, 0]), A([x, 0, 2, 2, 1, 0])],
  dom7: [E([0, 2, 0, 1, 0, 0]), A([x, 0, 2, 0, 2, 0])],
  maj7: [E([0, x, 1, 1, 0, x]), A([x, 0, 2, 1, 2, 0])],
  min7: [E([0, 2, 0, 0, 0, 0]), A([x, 0, 2, 0, 1, 0])],
  dim: [A([x, 0, 1, 2, 1, x])],
  dim7: [D([x, x, 0, 1, 0, 1])],
  aug: [A([x, 0, 3, 2, 2, x])],
  sus2: [A([x, 0, 2, 2, 0, 0])],
  sus4: [E([0, 2, 2, 2, 0, 0]), A([x, 0, 2, 2, 3, 0])],
  add9: [A([x, 0, 2, 4, 2, 0])],
  mAdd9: [A([x, 0, 2, 4, 1, 0])],
  m6: [A([x, 0, 2, 2, 1, 2])],
  dom9: [A([x, 0, -1, 0, 0, 0])],
  m9: [A([x, 0, -2, 0, 0, 0])],
  maj9: [A([x, 0, -1, 1, 0, x])],
  dom7sus4: [E([0, 2, 0, 2, 0, 0])],
  halfDim: [A([x, 0, 1, 0, 1, x])],
  aug7: [E([0, x, 0, 1, 1, x])],
  dom7b9: [A([x, 0, -1, 0, -1, x])],
  sharp11: [A([x, 0, 1, 0, 2, x])],
  dom13: [E([0, x, 0, 1, 2, x])],
  m11: [A([x, 0, 0, 0, 1, 0])],
  six: [A([x, 0, 2, 2, 2, 2])],
};

/** A guitar voicing: absolute frets, low string first (null = muted, 0 = open). */
export interface GuitarVoicing {
  readonly frets: readonly (number | null)[];
  /** The lowest fretted fret, for the diagram position (1 = at the nut). */
  readonly position: number;
}

export function hasGuitarVoicing(type: ChordTypeId): boolean {
  return SHAPES[type] !== undefined;
}

/**
 * The lowest playable voicing of a chord from the app table: each shape is
 * moved to the root, up an octave when a fret would be below the nut.
 * Null when the type has no shape.
 */
export function guitarVoicing(
  root: PitchClass,
  type: ChordTypeId,
): GuitarVoicing | null {
  const shapes = SHAPES[type];
  if (!shapes) return null;
  let best: GuitarVoicing | null = null;
  let bestScore = Infinity;
  for (const shape of shapes) {
    const open = GUITAR_TUNING[6 - shape.rootString] ?? 0;
    let rootFret = toPitchClass(root - open);
    const lowest = Math.min(
      ...shape.frets.filter((f): f is number => f !== null),
    );
    while (rootFret + lowest < 0) rootFret += 12;
    const frets = shape.frets.map((f) => (f === null ? null : rootFret + f));
    const played = frets.filter((f): f is number => f !== null);
    const max = Math.max(...played);
    const fretted = played.filter((f) => f > 0);
    const min = fretted.length ? Math.min(...fretted) : 1;
    // Lower on the neck is easier; a shape that fits in the first 4 frets
    // starts at the nut.
    const score = max;
    if (score < bestScore) {
      bestScore = score;
      best = { frets, position: max <= 4 ? 1 : min };
    }
  }
  return best;
}

/** The pitch classes a voicing sounds, low string first. */
export function voicingPitchClasses(voicing: GuitarVoicing): PitchClass[] {
  return voicing.frets.flatMap((f, i) =>
    f === null ? [] : [toPitchClass((GUITAR_TUNING[i] ?? 0) + f)],
  );
}
