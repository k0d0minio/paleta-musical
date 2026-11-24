import type { ChordRef, ChordTypeId } from "./chords";
import { toPitchClass, type PitchClass } from "./pitch";
import { getScale, type ScaleId } from "./scales";

/** R7 special numerals: a fixed offset from the key tonic; always tension. */
const SPECIAL: Readonly<Record<string, { offset: number; type: ChordTypeId }>> =
  {
    bVII: { offset: 10, type: "major" },
    bVI: { offset: 8, type: "major" },
    bIII: { offset: 3, type: "major" },
    bII: { offset: 1, type: "major" },
    "#IV": { offset: 6, type: "major" },
    VII: { offset: 11, type: "major" },
    III: { offset: 4, type: "major" },
    VI: { offset: 9, type: "major" },
    II: { offset: 2, type: "major" },
    I7: { offset: 0, type: "dom7" },
    IV7: { offset: 5, type: "dom7" },
    V7: { offset: 7, type: "dom7" },
  };

const DEGREES = ["i", "ii", "iii", "iv", "v", "vi", "vii"] as const;

export interface ResolvedNumeral {
  readonly numeral: string;
  readonly chord: ChordRef;
  /** A chromatic or borrowed chord (F084). */
  readonly tension: boolean;
}

/**
 * U35: Roman numerals need a 7-note scale. On any other scale, Estilos uses
 * the parent major or minor scale: major when the scale has a major third,
 * else natural minor. `parent` is true when the scale was replaced.
 */
export function romanScale(scale: ScaleId): {
  scale: ScaleId;
  parent: boolean;
} {
  const { intervals } = getScale(scale);
  if (intervals.length === 7) return { scale, parent: false };
  return {
    scale: intervals.includes(4) ? "major" : "naturalMinor",
    parent: true,
  };
}

/**
 * R7: resolves one Roman numeral against a key and scale. Special numerals
 * have a fixed offset and are tension. Others take the root from the scale
 * degree: uppercase major, lowercase minor, a "7" suffix adds the 7th. When
 * the degree does not exist in the scale, the last scale step is used without
 * a 7th (only possible when U35 is bypassed).
 */
export function resolveNumeral(
  numeral: string,
  key: PitchClass,
  scaleId: ScaleId,
): ResolvedNumeral {
  const special = SPECIAL[numeral];
  if (special) {
    return {
      numeral,
      chord: {
        root: toPitchClass(key + special.offset),
        type: special.type,
        inversion: 0,
      },
      tension: true,
    };
  }
  const seventh = numeral.endsWith("7");
  const body = seventh ? numeral.slice(0, -1) : numeral;
  const upper = body === body.toUpperCase();
  const degree = DEGREES.indexOf(
    body.toLowerCase() as (typeof DEGREES)[number],
  );
  if (degree < 0) throw new Error(`Unknown Roman numeral: ${numeral}`);
  const intervals = getScale(scaleId).intervals;
  const exists = degree < intervals.length;
  const step = exists ? intervals[degree] : intervals.at(-1);
  const withSeventh = seventh && exists;
  const type: ChordTypeId = upper
    ? withSeventh
      ? "dom7"
      : "major"
    : withSeventh
      ? "min7"
      : "minor";
  return {
    numeral,
    chord: { root: toPitchClass(key + (step ?? 0)), type, inversion: 0 },
    tension: false,
  };
}

/** Resolves a whole progression with the U35 rule. */
export function resolveProgression(
  numerals: readonly string[],
  key: PitchClass,
  scale: ScaleId,
): { chords: ResolvedNumeral[]; parentScale: ScaleId | null } {
  const used = romanScale(scale);
  return {
    chords: numerals.map((n) => resolveNumeral(n, key, used.scale)),
    parentScale: used.parent ? used.scale : null,
  };
}
