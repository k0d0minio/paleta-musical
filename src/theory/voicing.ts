import { getChordType, type ChordRef } from "./chords";
import { toMidi, fromMidi, type Note, type PitchClass, toPitchClass } from "./pitch";

/**
 * One inversion model for the whole app (fixes U30). Inversion k moves the k
 * lowest voices of the root-position voicing up one octave. The result is
 * ascending, as semitone offsets from the root of the chord in root position.
 */
export function invertIntervals(intervals: readonly number[], inversion: number): number[] {
  const sorted = [...intervals].sort((a, b) => a - b);
  const k = Math.max(0, Math.min(inversion, inversionCount(sorted) - 1));
  const moved = sorted.map((iv, idx) => (idx < k ? iv + 12 : iv));
  // A moved voice must sit above every voice that stayed.
  const top = Math.max(...moved.slice(k));
  for (let idx = 0; idx < k; idx++) {
    let value = moved[idx] ?? 0;
    while (value <= top) value += 12;
    moved[idx] = value;
  }
  return moved.sort((a, b) => a - b);
}

/** One inversion per chord voice (F052, F086), max one per distinct pitch class. */
export function inversionCount(intervals: readonly number[]): number {
  return new Set(intervals.map((i) => toPitchClass(i))).size;
}

/**
 * Real notes of a chord: the root sits in `octave`, the voices go up from it.
 * With an inversion the bass is the lowest note and stays in `octave` too.
 */
export function voiceChord(chord: ChordRef, octave: number): Note[] {
  const intervals = invertIntervals(getChordType(chord.type).intervals, chord.inversion);
  const lowest = intervals[0] ?? 0;
  const bassMidi = toMidi({ pc: toPitchClass(chord.root + lowest), octave });
  return intervals.map((iv) => fromMidi(bassMidi + (iv - lowest)));
}

/**
 * Real notes of a sequence of pitch classes that always goes up (fixes U33):
 * the first note is in `octave`, each next note is the nearest one above.
 */
export function realizeAscending(pcs: readonly PitchClass[], octave: number): Note[] {
  const out: Note[] = [];
  let previous = -Infinity;
  for (const pc of pcs) {
    let midi = toMidi({ pc, octave });
    if (out.length === 0) {
      previous = midi;
    } else {
      while (midi <= previous) midi += 12;
      previous = midi;
    }
    out.push(fromMidi(midi));
  }
  return out;
}

/**
 * Real notes of a block chord given as pitch classes, root first (F023): the
 * root is in `octave`, the other notes are within the octave above it.
 */
export function realizeChordInOctave(pcs: readonly PitchClass[], octave: number): Note[] {
  const [root, ...rest] = pcs;
  if (root === undefined) return [];
  const rootMidi = toMidi({ pc: root, octave });
  const notes = [rootMidi, ...rest.map((pc) => rootMidi + toPitchClass(pc - root))];
  return [...new Set(notes)].sort((a, b) => a - b).map(fromMidi);
}
