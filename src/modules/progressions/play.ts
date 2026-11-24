"use client";

import { audioEngine, playRhythm, stopRhythm } from "@/audio";
import { useAppStore, type ProgressionItem } from "@/state";
import {
  chordPitchClasses,
  voiceChord,
  type ChordRef,
  type RhythmId,
  type RhythmOptions,
} from "@/theory";

/** Plays one chord in the global octave, marks it and sets it as the last chord (F085, F119, F139). */
export function playChordRef(chord: ChordRef, markSeconds = 1.8): void {
  const { octave } = useAppStore.getState().global;
  audioEngine.playChord(voiceChord(chord, octave), { markSeconds });
  useAppStore
    .getState()
    .setLastChord(chordPitchClasses(chord.root, chord.type), chord);
}

/** Plays a list of chords with a rhythm, or stops it when that list already plays. */
export function toggleRhythm(
  source: string,
  playing: boolean,
  chords: readonly ChordRef[],
  rhythm: RhythmId,
  options: RhythmOptions,
  loop = false,
): void {
  if (playing) {
    stopRhythm(source);
    return;
  }
  const { octave } = useAppStore.getState().global;
  void playRhythm({
    source,
    rhythm,
    options,
    loop,
    chords: chords.map((c) => voiceChord(c, octave)),
  });
}

export const itemsToChords = (items: readonly ProgressionItem[]) =>
  items.map((i) => i.chord);
