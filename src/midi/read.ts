import { Midi } from "@tonejs/midi";
import { TICKS_PER_QUARTER, type Song, type SongNote } from "./song";

/** Reads a Standard MIDI File (format 0 or 1) into a `Song`. Tick times are rescaled to 480 PPQ. */
export function readSmf(bytes: Uint8Array): Song {
  const midi = new Midi(bytes);
  const scale = TICKS_PER_QUARTER / midi.header.ppq;
  const notes: SongNote[] = midi.tracks
    .flatMap((track) => track.notes)
    .map((n) => ({
      midi: n.midi,
      startTick: Math.round(n.ticks * scale),
      durationTicks: Math.round(n.durationTicks * scale),
      velocity: Math.round(n.velocity * 127),
    }))
    .sort((a, b) => a.startTick - b.startTick || a.midi - b.midi);

  const timeSignature = midi.header.timeSignatures[0]?.timeSignature ?? [4, 4];
  const namedTrack = midi.tracks.find((t) => t.name);
  return {
    tempoBpm: midi.header.tempos[0]?.bpm ?? 120,
    timeSignature: [timeSignature[0] ?? 4, timeSignature[1] ?? 4],
    trackName: namedTrack?.name ?? midi.header.name ?? "",
    program:
      midi.tracks.find((t) => t.notes.length > 0)?.instrument.number ?? 0,
    notes,
  };
}
