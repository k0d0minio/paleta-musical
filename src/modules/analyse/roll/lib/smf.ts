import {
  clampVelocity as clampSongVelocity,
  secondsToTicks,
  ticksToSeconds,
  type Song,
} from "@/midi";
import {
  PITCH_MAX,
  PITCH_MIN,
  clampBpm,
  sortNotes,
  withIds,
  type RollNote,
} from "./model";

/** F263, R21: the export file name. */
export const ROLL_MIDI_FILE = "paleta-musical.mid";
export const ROLL_TRACK_NAME = "Paleta Musical";

/**
 * R21: the roll notes at their real times as a `Song` (format 0, 480 PPQ,
 * tempo from the roll BPM, program 0, track name "Paleta Musical",
 * tick = round(seconds × BPM/60 × 480), velocity 1–127). `writeSmf` writes it.
 */
export function rollToSong(notes: readonly RollNote[], bpm: number): Song {
  return {
    tempoBpm: bpm,
    timeSignature: [4, 4],
    trackName: ROLL_TRACK_NAME,
    program: 0,
    notes: sortNotes(notes).map((n) => {
      const startTick = secondsToTicks(n.start, bpm);
      const endTick = secondsToTicks(n.start + n.duration, bpm);
      return {
        midi: n.midi,
        startTick,
        durationTicks: Math.max(1, endTick - startTick),
        velocity: clampSongVelocity(n.velocity),
      };
    }),
  };
}

/** Folds a MIDI note into 36–96 by octaves (the roll range), keeping its pitch class. */
export function foldIntoRange(midi: number): number {
  let m = Math.round(midi);
  while (m < PITCH_MIN) m += 12;
  while (m > PITCH_MAX) m -= 12;
  return m;
}

/** Import (new): a read `Song` as roll notes in seconds, with its BPM. */
export function songToRoll(song: Song): {
  notes: RollNote[];
  bpm: number;
  folded: number;
} {
  let folded = 0;
  const notes = withIds(
    song.notes.map((n) => {
      const midi = foldIntoRange(n.midi);
      if (midi !== n.midi) folded += 1;
      return {
        midi,
        start: ticksToSeconds(n.startTick, song.tempoBpm),
        duration: Math.max(
          0.01,
          ticksToSeconds(n.durationTicks, song.tempoBpm),
        ),
        velocity: Math.min(127, Math.max(1, n.velocity)),
      };
    }),
  );
  return { notes, bpm: clampBpm(song.tempoBpm), folded };
}
