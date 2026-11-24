import { getChordType, type ChordTypeId } from "./chords";
import type { KeyContext } from "./names";
import type { PitchClass } from "./pitch";

/**
 * The key a chord is spelled in when the spelling setting is "key": a scale
 * on the chord root that holds the chord's thirds and sevenths (Cm7 in C
 * Dórica gives E♭ and B♭; C7 in C Mixolídia gives B♭).
 */
export function chordKeyContext(
  root: PitchClass,
  type: ChordTypeId,
): KeyContext {
  const pcs = new Set(getChordType(type).intervals.map((i) => i % 12));
  const minorThird = pcs.has(3) && !pcs.has(4);
  if (minorThird)
    return { tonic: root, scale: pcs.has(6) ? "locrian" : "dorian" };
  if (pcs.has(4) && pcs.has(10))
    return {
      tonic: root,
      scale: pcs.has(1) ? "phrygianDominant" : "mixolydian",
    };
  return { tonic: root, scale: "major" };
}
