"use client";

import { audioEngine } from "@/audio";
import { useAppStore } from "@/state";
import {
  fromMidi,
  realizeAscending,
  toMidi,
  voiceChord,
  type ChordRef,
  type PitchClass,
} from "@/theory";

/** R15 spacing of note sequences, in ms. */
export const SPACING = {
  scale: 280,
  free: 300,
  detect: 260,
  chords: 260,
} as const;
/** F040, F058, F065: each note of a sequence is marked as sounding for 0.6 s. */
export const SEQUENCE_MARK_SECONDS = 0.6;
/** F045, F049, F053, F055, F179: a chord is marked as sounding for 1.8 s. */
export const CHORD_MARK_SECONDS = 1.8;

const octave = () => useAppStore.getState().global.octave;

/**
 * Plays pitch classes one by one, going up (U33), `spacingMs` apart, on the
 * engine scheduler (sample-accurate; Esc and a module switch stop it).
 */
export function playSequence(
  pcs: readonly PitchClass[],
  spacingMs: number,
): void {
  const notes = realizeAscending(pcs, octave());
  void audioEngine.schedule(
    notes.map((note, i) => ({
      at: (i * spacingMs) / 1000,
      notes: [note],
      kind: "note" as const,
      options: { markSeconds: SEQUENCE_MARK_SECONDS },
    })),
  );
}

/** Plays a chord in the global octave (root position or its inversion). */
export function playChordRef(chord: ChordRef): void {
  audioEngine.playChord(voiceChord(chord, octave()), {
    markSeconds: CHORD_MARK_SECONDS,
  });
}

/** Plays a set of intervals from a root in the global octave (F055). */
export function playIntervals(
  root: PitchClass,
  intervals: readonly number[],
): void {
  const base = toMidi({ pc: root, octave: octave() });
  audioEngine.playChord(
    intervals.map((iv) => fromMidi(base + iv)),
    { markSeconds: CHORD_MARK_SECONDS },
  );
}
