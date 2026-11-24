import { getChordType, type ChordTypeId } from "./chords";
import { toPitchClass } from "./pitch";

/** F054: the four altered versions, in the app order. */
export const ALTERATIONS = ["b9", "#11", "b13", "alt"] as const;
export type Alteration = (typeof ALTERATIONS)[number];

/** Pitch classes (from the root) of each tension. */
const FLAT_NINE = 1;
const NINE = 2;
const ELEVEN = 5;
const SHARP_ELEVEN = 6;
const FLAT_THIRTEEN = 8;
const THIRTEEN = 9;

const has = (intervals: readonly number[], pc: number, below12 = false) =>
  intervals.some((iv) => toPitchClass(iv) === pc && (!below12 || iv < 12));

function normalise(intervals: readonly number[]): number[] {
  return [...new Set(intervals)].sort((a, b) => a - b);
}

/**
 * Builds one altered version on the chord type's own intervals (fixes U10).
 * Returns null when the type cannot take that alteration:
 * - b9: the 9 (14) becomes b9 (13), else b9 is added. Not for a type that
 *   already has b9, or whose 2 is a chord tone (sus2).
 * - #11: the 11 (17) becomes #11 (18), else #11 is added. Not for a type
 *   that already has the b5/#11 pitch class (dim, ø7, °7, 7♭5♯11) or whose 4
 *   is a chord tone (sus4, 7sus4).
 * - b13: the 13 (21) becomes b13 (20), else b13 is added. Not for a type that
 *   already has the #5/b13 pitch class (aug, +7) or a 6 (6, m6, °7).
 * - alt: only for a dominant type (major third and minor seventh). The 5
 *   becomes b5 (a #5 stays), the 9 becomes b9 (added if missing) and the 13
 *   becomes b13.
 */
export function alteredIntervals(
  type: ChordTypeId,
  alteration: Alteration,
): number[] | null {
  const base = getChordType(type).intervals;
  switch (alteration) {
    case "b9": {
      if (has(base, FLAT_NINE) || has(base, NINE, true)) return null;
      const out = base.filter((iv) => toPitchClass(iv) !== NINE);
      return normalise([...out, 13]);
    }
    case "#11": {
      if (has(base, SHARP_ELEVEN) || has(base, ELEVEN, true)) return null;
      const out = base.filter((iv) => toPitchClass(iv) !== ELEVEN);
      return normalise([...out, 18]);
    }
    case "b13": {
      if (has(base, FLAT_THIRTEEN) || has(base, THIRTEEN, true)) return null;
      const out = base.filter((iv) => toPitchClass(iv) !== THIRTEEN);
      return normalise([...out, 20]);
    }
    case "alt": {
      if (!base.includes(4) || !base.includes(10)) return null;
      const out = base.map((iv) => {
        if (iv === 7) return 6;
        if (iv === 14) return 13;
        if (iv === 21) return 20;
        return iv;
      });
      return normalise(out.includes(13) ? out : [...out, 13]);
    }
  }
}

/** The altered versions a chord type can take, in the app order. */
export function alterationsFor(
  type: ChordTypeId,
): { alteration: Alteration; intervals: number[] }[] {
  return ALTERATIONS.flatMap((alteration) => {
    const intervals = alteredIntervals(type, alteration);
    return intervals ? [{ alteration, intervals }] : [];
  });
}

/** The alteration label in music notation: "♭9", "♯11", "♭13", "alt". */
export function alterationSymbol(alteration: Alteration): string {
  return alteration.replace("b", "♭").replace("#", "♯");
}
