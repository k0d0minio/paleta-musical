import type { ChordRef, ChordTypeId } from "./chords";
import type { PitchClass } from "./pitch";
import { getScale, scalePitchClasses, type ScaleId } from "./scales";

export type TriadQuality = "major" | "minor" | "dim" | "aug";

const M = "major";
const m = "minor";
const d = "dim";
const A = "aug";

/**
 * R5: the triad quality of each degree (I–VII) for the 8 modal scales that
 * have diatonic chords in the Paleta (F044).
 */
export const DIATONIC_QUALITIES: Readonly<
  Partial<Record<ScaleId, readonly TriadQuality[]>>
> = {
  major: [M, m, m, M, M, m, d],
  naturalMinor: [m, d, M, m, m, M, M],
  harmonicMinor: [m, d, A, m, M, M, d],
  dorian: [m, m, M, M, m, d, M],
  phrygian: [m, M, M, m, d, M, m],
  lydian: [M, M, m, d, M, m, m],
  mixolydian: [M, m, d, M, m, m, M],
  locrian: [d, M, m, m, M, M, m],
};

const QUALITY_TYPE: Record<TriadQuality, ChordTypeId> = {
  major: "major",
  minor: "minor",
  dim: "dim",
  aug: "aug",
};

/** True when the scale has diatonic chords (R5 and exactly 7 notes). */
export function hasDiatonicChords(scale: ScaleId): boolean {
  return (
    DIATONIC_QUALITIES[scale] !== undefined &&
    getScale(scale).intervals.length === 7
  );
}

/**
 * F044: the 7 diatonic triads of a scale on a tonic, one per degree, or an
 * empty list for a scale without R5 qualities.
 */
export function diatonicChords(tonic: PitchClass, scale: ScaleId): ChordRef[] {
  const qualities = DIATONIC_QUALITIES[scale];
  if (!qualities || !hasDiatonicChords(scale)) return [];
  const pcs = scalePitchClasses(tonic, scale);
  return qualities.map((q, i) => ({
    root: pcs[i] ?? tonic,
    type: QUALITY_TYPE[q],
    inversion: 0,
  }));
}
