/**
 * Pitch primitives. A `PitchClass` is 0–11 (C = 0). A `Note` is a real note
 * with an octave in scientific pitch notation: C4 is middle C (MIDI 60).
 */
export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export interface Note {
  readonly pc: PitchClass;
  readonly octave: number;
}

export const PITCH_CLASSES: readonly PitchClass[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export const OCTAVE_MIN = 2;
export const OCTAVE_MAX = 6;
export const OCTAVE_DEFAULT = 4;

/** Folds any integer into a pitch class. */
export function toPitchClass(n: number): PitchClass {
  return (((Math.round(n) % 12) + 12) % 12) as PitchClass;
}

export function isPitchClass(n: unknown): n is PitchClass {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 11;
}

export function clampOctave(octave: number): number {
  return Math.min(OCTAVE_MAX, Math.max(OCTAVE_MIN, Math.round(octave)));
}

export function toMidi(note: Note): number {
  return (note.octave + 1) * 12 + note.pc;
}

export function fromMidi(midi: number): Note {
  return { pc: toPitchClass(midi), octave: Math.floor(midi / 12) - 1 };
}

/** Equal temperament, A4 = 440 Hz (same formula as F007). */
export function frequencyOfMidi(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function frequency(note: Note): number {
  return frequencyOfMidi(toMidi(note));
}

export function noteEquals(a: Note, b: Note): boolean {
  return a.pc === b.pc && a.octave === b.octave;
}
