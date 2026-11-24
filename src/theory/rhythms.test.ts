import { describe, expect, it } from "vitest";
import {
  RHYTHM_IDS,
  autoArpNoteMs,
  renderRhythm,
  toMidi,
  type Note,
  type RhythmId,
} from ".";

const n = (pc: Note["pc"], octave = 4): Note => ({ pc, octave });
const C = [n(0), n(4), n(7)];
const F = [n(5), n(9), n(0, 5)];
const TWO = [C, F];

const times = (id: RhythmId, opts = {}) =>
  renderRhythm(id, TWO, { bpm: 120, ...opts }).events.map(
    (e) => +e.beat.toFixed(4),
  );
const unique = (xs: number[]) => [...new Set(xs)];

/** R9 event times in beats for two triads (written out by hand). */
const EXPECTED: Record<RhythmId, number[]> = {
  simples: [0, 1],
  loop: [0, 1],
  half: [0, 2],
  arpejo: [0, 0.5, 1, 1.5, 2, 2.5],
  "arpejo-down": [0, 0.5, 1, 1.5, 2, 2.5],
  "arpejo-ud": [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5],
  swing: [0, 0.67, 1, 1.67],
  ballad: [0, 0.4, 2, 2.4],
  funk: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
  // 40 ms at 120 BPM = 0.08 beat between strings.
  strum: [
    0, 0.08, 0.16, 1, 1.08, 1.16, 2, 2.08, 2.16, 3, 3.08, 3.16, 4, 4.08, 4.16,
    5, 5.08, 5.16, 6, 6.08, 6.16, 7, 7.08, 7.16,
  ],
  bossa: [0, 0.4, 1, 1.5, 2, 2.4, 3, 3.5],
  waltz: [0, 1, 2, 3, 4, 5],
};

describe("R9 rhythms", () => {
  it("has 12 rhythms", () => expect(RHYTHM_IDS).toHaveLength(12));

  it.each(RHYTHM_IDS.map((id) => [id]))("%s has the R9 timing", (id) => {
    expect(unique(times(id))).toEqual(EXPECTED[id]);
  });

  it("simples: chord per beat, 0.85 beat, vol 0.18, vel 90", () => {
    const [e] = renderRhythm("simples", TWO).events;
    expect(e).toMatchObject({
      durationBeats: 0.85,
      volume: 0.18,
      velocity: 90,
      first: true,
    });
    expect(e?.notes).toHaveLength(3);
  });

  it("arpeggios play in interval order, reversed, and up then down", () => {
    const pcs = (id: RhythmId) =>
      renderRhythm(id, [C]).events.map((e) => e.notes[0]?.pc);
    expect(pcs("arpejo")).toEqual([0, 4, 7]);
    expect(pcs("arpejo-down")).toEqual([7, 4, 0]);
    expect(pcs("arpejo-ud")).toEqual([0, 4, 7, 7, 4, 0]);
  });

  it("U05: the arpeggio note speed sets the note step; null follows the BPM", () => {
    expect(unique(times("arpejo", { arpNoteMs: 100 }))).toEqual([
      0, 0.2, 0.4, 0.6, 0.8, 1,
    ]);
    expect(autoArpNoteMs(120)).toBe(250);
  });

  it("swing: ghost upper notes one octave lower at swing × beat, vel 45", () => {
    const evs = renderRhythm("swing", [C], { swing: 0.6 }).events;
    expect(evs[1]).toMatchObject({ beat: 0.6, velocity: 45, volume: 0.1 });
    expect(evs[1]?.notes.map(toMidi)).toEqual([52, 55]);
  });

  it("ballad, bossa and waltz put the bass one octave lower", () => {
    for (const id of ["ballad", "bossa", "waltz"] as const) {
      expect(renderRhythm(id, [C]).events[0]?.notes.map(toMidi)).toEqual([48]);
    }
  });

  it("strum: up-up-down-up with velocities 85, 77, 69", () => {
    const evs = renderRhythm("strum", [C]).events;
    expect(evs.slice(0, 3).map((e) => e.velocity)).toEqual([85, 77, 69]);
    expect(evs.slice(6, 9).map((e) => e.notes[0]?.pc)).toEqual([7, 4, 0]);
  });

  it("loop repeats the whole progression N times", () => {
    const r = renderRhythm("loop", TWO, { repeats: 3 });
    expect(r.events.map((e) => e.chordIndex)).toEqual([0, 1, 0, 1, 0, 1]);
    expect(r.totalBeats).toBe(6);
  });

  it("marks the first event of each chord slot", () => {
    const evs = renderRhythm("funk", TWO).events;
    expect(
      evs.filter((e) => e.first).map((e) => [e.beat, e.chordIndex]),
    ).toEqual([
      [0, 0],
      [2, 1],
    ]);
  });

  it("an empty list renders nothing (F093)", () => {
    expect(renderRhythm("simples", []).events).toEqual([]);
  });
});
