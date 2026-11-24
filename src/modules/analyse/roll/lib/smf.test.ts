import { Midi } from "@tonejs/midi";
import { describe, expect, it } from "vitest";
import { readSmf, secondsToTicks, writeSmf } from "@/midi";
import type { RollNote } from "./model";
import { ROLL_MIDI_FILE, foldIntoRange, rollToSong, songToRoll } from "./smf";

const notes: RollNote[] = [
  { id: "a", midi: 60, start: 0, duration: 0.5, velocity: 90 },
  { id: "b", midi: 64, start: 0.25, duration: 0.333, velocity: 1 },
  { id: "c", midi: 67, start: 1.1234, duration: 0.05, velocity: 127 },
  // Same pitch, one note ends where the next one starts.
  { id: "d", midi: 72, start: 2, duration: 0.5, velocity: 100 },
  { id: "e", midi: 72, start: 2.5, duration: 0.5, velocity: 80 },
];

describe("R21 MIDI export", () => {
  const bpm = 97;
  const bytes = writeSmf(rollToSong(notes, bpm));
  const parsed = new Midi(bytes);

  it("is format 0, 480 PPQ, tempo, program 0, track name, file name (F263)", () => {
    expect(ROLL_MIDI_FILE).toBe("paleta-musical.mid");
    expect(parsed.header.ppq).toBe(480);
    expect(parsed.tracks).toHaveLength(1);
    expect(parsed.header.tempos[0]?.bpm).toBeCloseTo(bpm, 2);
    expect(parsed.tracks[0]?.name).toBe("Paleta Musical");
    expect(parsed.tracks[0]?.instrument.number).toBe(0);
    expect(bytes[9]).toBe(0); // format 0 (header bytes 8–9)
  });

  it("U19: the track-name meta length is the real byte length (14)", () => {
    const text = [...new TextEncoder().encode("Paleta Musical")];
    const at = bytes.findIndex((b, i) => b === 0xff && bytes[i + 1] === 0x03);
    expect(bytes[at + 2]).toBe(14);
    expect([...bytes.slice(at + 3, at + 3 + 14)]).toEqual(text);
  });

  it("parses with @tonejs/midi with the same notes, times (1 tick) and velocities", () => {
    const out = parsed.tracks[0]?.notes ?? [];
    expect(out).toHaveLength(notes.length);
    notes.forEach((n, i) => {
      const o = out[i];
      expect(o?.midi).toBe(n.midi);
      expect(
        Math.abs((o?.ticks ?? -9) - secondsToTicks(n.start, bpm)),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(
          (o?.durationTicks ?? -9) -
            (secondsToTicks(n.start + n.duration, bpm) -
              secondsToTicks(n.start, bpm)),
        ),
      ).toBeLessThanOrEqual(1);
      expect(Math.round((o?.velocity ?? 0) * 127)).toBe(n.velocity);
    });
  });

  it("U19: a note-off comes before a note-on at the same tick", () => {
    const sameTick = secondsToTicks(2.5, bpm);
    const out = parsed.tracks[0]?.notes.filter((n) => n.midi === 72) ?? [];
    expect(out).toHaveLength(2);
    expect(out[0]?.ticks + (out[0]?.durationTicks ?? 0)).toBe(sameTick);
    expect(out[1]?.ticks).toBe(sameTick);
    expect(out[1]?.durationTicks).toBeGreaterThan(0);
  });

  it("imports its own file back (new: .mid import)", () => {
    const back = songToRoll(readSmf(bytes));
    expect(back.bpm).toBe(bpm);
    expect(back.notes.map((n) => n.midi)).toEqual(notes.map((n) => n.midi));
    back.notes.forEach((n, i) => {
      expect(n.start).toBeCloseTo(notes[i]?.start ?? -1, 2);
      expect(n.velocity).toBe(notes[i]?.velocity);
    });
  });

  it("folds imported notes outside 36–96 into the roll range", () => {
    expect(foldIntoRange(24)).toBe(36);
    expect(foldIntoRange(100)).toBe(88);
    expect(foldIntoRange(60)).toBe(60);
  });
});
