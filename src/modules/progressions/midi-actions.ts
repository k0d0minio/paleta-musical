"use client";

import {
  progressionFileName,
  progressionSong,
  readSmf,
  songToChords,
  writeSmf,
  type ImportedChords,
} from "@/midi";
import { shareOrDownload, type ShareResult } from "@/platform";
import { useAppStore } from "@/state";
import {
  renderRhythm,
  voiceChord,
  type ChordRef,
  type RhythmId,
  type RhythmOptions,
} from "@/theory";

/** The MIDI file bytes of a progression: the same rhythm events as the audio (U31), global octave (F021). */
export function progressionMidi(
  chords: readonly ChordRef[],
  rhythm: RhythmId,
  options: RhythmOptions,
  octave: number,
): Uint8Array {
  const { events } = renderRhythm(
    rhythm,
    chords.map((c) => voiceChord(c, octave)),
    options,
  );
  return writeSmf(progressionSong(events, options.bpm));
}

/** F113, F135: downloads the file, or opens the share sheet on iOS. */
export async function exportProgressionMidi(
  chords: readonly ChordRef[],
  rhythm: RhythmId,
  options: RhythmOptions,
): Promise<{ result: ShareResult; fileName: string }> {
  const { octave } = useAppStore.getState().global;
  const bytes = progressionMidi(chords, rhythm, options, octave);
  const fileName = progressionFileName(rhythm);
  const data = new Uint8Array(bytes);
  const result = await shareOrDownload(data, fileName, "audio/midi");
  return { result, fileName };
}

/** Reads a .mid file into named chords (R10). Throws when the file is not MIDI. */
export async function readMidiChords(file: File): Promise<ImportedChords> {
  const buffer = await file.arrayBuffer();
  return songToChords(readSmf(new Uint8Array(buffer)));
}
