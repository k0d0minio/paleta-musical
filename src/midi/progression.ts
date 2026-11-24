import {
  nameNotes,
  toPitchClass,
  type ChordRef,
  type PitchClass,
  type RhythmEvent,
  type RhythmId,
  toMidi,
} from "@/theory";
import { TICKS_PER_QUARTER, type Song } from "./song";

/** F265: the track name of a progression file. */
export const PROGRESSION_TRACK_NAME = "Paleta Musical";

/**
 * F265, F266: a progression as a song. Format 0 and 480 PPQ come from
 * `writeSmf`. The notes are the rhythm events (the same ones the audio plays,
 * U31) with their real MIDI numbers (C4 = 60, U32).
 */
export function progressionSong(
  events: readonly RhythmEvent[],
  bpm: number,
): Song {
  return {
    tempoBpm: bpm,
    timeSignature: [4, 4],
    trackName: PROGRESSION_TRACK_NAME,
    program: 0,
    notes: events.flatMap((e) =>
      e.notes.map((n) => ({
        midi: toMidi(n),
        startTick: Math.round(e.beat * TICKS_PER_QUARTER),
        durationTicks: Math.max(
          1,
          Math.round(e.durationBeats * TICKS_PER_QUARTER),
        ),
        velocity: e.velocity,
      })),
    ),
  };
}

/** F267: "progressao-<rhythm key>-paleta.mid". */
export function progressionFileName(rhythm: RhythmId): string {
  return `progressao-${rhythm}-paleta.mid`;
}

export interface ImportedChords {
  readonly chords: ChordRef[];
  /** Note groups that no chord type names. */
  readonly skipped: number;
}

/**
 * MIDI import: notes that start together (within a 32nd note) form one
 * chord, named with R10 (bass = lowest note). Groups with fewer than 2
 * distinct pitch classes, or with no exact chord, are skipped.
 */
export function songToChords(song: Song): ImportedChords {
  const tolerance = TICKS_PER_QUARTER / 8;
  const sorted = [...song.notes].sort((a, b) => a.startTick - b.startTick);
  const groups: (typeof sorted)[] = [];
  for (const note of sorted) {
    const group = groups.at(-1);
    const head = group?.[0];
    if (group && head && note.startTick - head.startTick <= tolerance)
      group.push(note);
    else groups.push([note]);
  }
  const chords: ChordRef[] = [];
  let skipped = 0;
  for (const group of groups) {
    const ordered = [...group].sort((a, b) => a.midi - b.midi);
    const pcs: PitchClass[] = [];
    for (const n of ordered) {
      const pc = toPitchClass(n.midi);
      if (!pcs.includes(pc)) pcs.push(pc);
    }
    if (pcs.length < 2) {
      skipped += 1;
      continue;
    }
    const chord = nameNotes(pcs, pcs[0]);
    if (chord) chords.push(chord);
    else skipped += 1;
  }
  return { chords, skipped };
}
