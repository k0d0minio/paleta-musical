import { toPitchClass, type PitchClass } from "./pitch";

/**
 * R3: the app's 19 scales, in the app's own order. `tonal` is the matching
 * tonal scale-type name (a unit test checks that the intervals agree).
 * Display names come from the messages (`scales.<id>`), not from here.
 */
export const SCALES = [
  { id: "major", intervals: [0, 2, 4, 5, 7, 9, 11], tonal: "major" },
  { id: "naturalMinor", intervals: [0, 2, 3, 5, 7, 8, 10], tonal: "aeolian" },
  { id: "harmonicMinor", intervals: [0, 2, 3, 5, 7, 8, 11], tonal: "harmonic minor" },
  { id: "melodicMinor", intervals: [0, 2, 3, 5, 7, 9, 11], tonal: "melodic minor" },
  { id: "majorPentatonic", intervals: [0, 2, 4, 7, 9], tonal: "major pentatonic" },
  { id: "minorPentatonic", intervals: [0, 3, 5, 7, 10], tonal: "minor pentatonic" },
  { id: "blues", intervals: [0, 3, 5, 6, 7, 10], tonal: "blues" },
  { id: "majorBlues", intervals: [0, 2, 3, 4, 7, 9], tonal: "major blues" },
  { id: "dorian", intervals: [0, 2, 3, 5, 7, 9, 10], tonal: "dorian" },
  { id: "phrygian", intervals: [0, 1, 3, 5, 7, 8, 10], tonal: "phrygian" },
  { id: "lydian", intervals: [0, 2, 4, 6, 7, 9, 11], tonal: "lydian" },
  { id: "mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10], tonal: "mixolydian" },
  { id: "locrian", intervals: [0, 1, 3, 5, 6, 8, 10], tonal: "locrian" },
  { id: "phrygianDominant", intervals: [0, 1, 4, 5, 7, 8, 10], tonal: "phrygian dominant" },
  { id: "chromatic", intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], tonal: "chromatic" },
  { id: "arabic", intervals: [0, 2, 4, 5, 6, 8, 10], tonal: "arabian" },
  { id: "japanese", intervals: [0, 1, 5, 7, 8], tonal: "kumoijoshi" },
  { id: "hungarianMinor", intervals: [0, 2, 3, 6, 7, 8, 11], tonal: "hungarian minor" },
  { id: "bebopDominant", intervals: [0, 2, 4, 5, 7, 9, 10, 11], tonal: "bebop" },
] as const satisfies readonly { id: string; intervals: readonly number[]; tonal: string | null }[];

export type ScaleId = (typeof SCALES)[number]["id"];

export interface ScaleDef {
  readonly id: ScaleId;
  readonly intervals: readonly number[];
  readonly tonal: string | null;
}

export const SCALE_IDS: readonly ScaleId[] = SCALES.map((s) => s.id);

export function isScaleId(value: unknown): value is ScaleId {
  return typeof value === "string" && (SCALE_IDS as readonly string[]).includes(value);
}

export function getScale(id: ScaleId): ScaleDef {
  const scale = SCALES.find((s) => s.id === id);
  if (!scale) throw new Error(`Unknown scale: ${id}`);
  return scale;
}

/** The pitch classes of a scale on a tonic, in scale order. */
export function scalePitchClasses(tonic: PitchClass, id: ScaleId): PitchClass[] {
  return getScale(id).intervals.map((i) => toPitchClass(tonic + i));
}
