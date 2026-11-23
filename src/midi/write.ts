import { writeMidi, type MidiEvent } from "midi-file";
import { TICKS_PER_QUARTER, clampMidi, clampVelocity, type Song } from "./song";

type WithoutDelta<T> = T extends unknown ? Omit<T, "deltaTime"> : never;
type AbsoluteEvent = { tick: number; order: number; event: WithoutDelta<MidiEvent> };

/**
 * Writes a Standard MIDI File, format 0 (one track), 480 ticks per quarter
 * note, with tempo, time signature, track name and program (F265, R21).
 */
export function writeSmf(song: Song): Uint8Array {
  const [numerator, denominator] = song.timeSignature;
  const events: AbsoluteEvent[] = [
    { tick: 0, order: 0, event: { type: "trackName", meta: true, text: song.trackName } },
    {
      tick: 0,
      order: 0,
      event: {
        type: "timeSignature",
        meta: true,
        numerator,
        denominator,
        metronome: 24,
        thirtyseconds: 8,
      },
    },
    {
      tick: 0,
      order: 0,
      event: {
        type: "setTempo",
        meta: true,
        microsecondsPerBeat: Math.round(60_000_000 / song.tempoBpm),
      },
    },
    {
      tick: 0,
      order: 0,
      event: { type: "programChange", channel: 0, programNumber: song.program },
    },
  ];

  for (const note of song.notes) {
    const midi = clampMidi(note.midi);
    const start = Math.max(0, Math.round(note.startTick));
    const end = start + Math.max(1, Math.round(note.durationTicks));
    // Note-offs sort before note-ons at the same tick, so repeated notes do not cut each other.
    events.push({
      tick: start,
      order: 2,
      event: { type: "noteOn", channel: 0, noteNumber: midi, velocity: clampVelocity(note.velocity) },
    });
    events.push({
      tick: end,
      order: 1,
      event: { type: "noteOff", channel: 0, noteNumber: midi, velocity: 0 },
    });
  }

  events.sort((a, b) => a.tick - b.tick || a.order - b.order);
  const last = events.at(-1)?.tick ?? 0;

  let previous = 0;
  const track: MidiEvent[] = events.map(({ tick, event }) => {
    const withDelta = { ...event, deltaTime: tick - previous } as MidiEvent;
    previous = tick;
    return withDelta;
  });
  track.push({ type: "endOfTrack", meta: true, deltaTime: last - previous });

  const bytes = writeMidi({
    header: { format: 0, numTracks: 1, ticksPerBeat: TICKS_PER_QUARTER },
    tracks: [track],
  });
  return Uint8Array.from(bytes);
}
