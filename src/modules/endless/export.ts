import {
  TICKS_PER_QUARTER,
  clampMidi,
  writeSmf,
  type Song,
  type SongNote,
} from "@/midi";
import { useAppStore } from "@/state";
import { CHORD_SOUND_RATIO, toMidi } from "@/theory";
import type { HistoryEntry } from "./generator";

/** The last chords the "send" actions take. */
export const SEND_LAST_COUNT = 8;

/** Appends generated chords to the shared timeline; an added 7th keeps its tension mark. */
export function sendToTimeline(entries: readonly HistoryEntry[]): number {
  useAppStore
    .getState()
    .timelineActions.append(
      entries.map((e) => ({ chord: e.chord, tension: e.seventh })),
    );
  return entries.length;
}

/** The generated chords as a MIDI song: each chord fills its slot, as it sounded. */
export function historyToSong(
  entries: readonly HistoryEntry[],
  bpm: number,
): Song {
  const notes: SongNote[] = [];
  let tick = 0;
  for (const entry of entries) {
    const slotTicks = entry.beats * TICKS_PER_QUARTER;
    for (const note of entry.notes) {
      notes.push({
        midi: clampMidi(toMidi(note)),
        startTick: tick,
        durationTicks: Math.round(slotTicks * CHORD_SOUND_RATIO),
        velocity: 90,
      });
    }
    tick += slotTicks;
  }
  return {
    tempoBpm: bpm,
    timeSignature: [4, 4],
    trackName: "Paleta Musical",
    program: 0,
    notes,
  };
}

export function historyToMidi(
  entries: readonly HistoryEntry[],
  bpm: number,
): Uint8Array {
  return writeSmf(historyToSong(entries, bpm));
}
