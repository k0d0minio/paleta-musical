import { parseMidi } from "midi-file";
import { describe, expect, it } from "vitest";
import { readSmf, secondsToTicks, writeSmf, type Song } from ".";

const song: Song = {
  tempoBpm: 90,
  timeSignature: [4, 4],
  trackName: "Paleta Musical",
  program: 0,
  notes: [
    { midi: 60, startTick: 0, durationTicks: 480, velocity: 100 },
    { midi: 64, startTick: 0, durationTicks: 480, velocity: 100 },
    { midi: 60, startTick: 480, durationTicks: 240, velocity: 300 },
  ],
};

describe("writeSmf", () => {
  it("writes format 0, one track, 480 PPQ (F265)", () => {
    const parsed = parseMidi(writeSmf(song));
    expect(parsed.header.format).toBe(0);
    expect(parsed.header.numTracks).toBe(1);
    expect(parsed.header.ticksPerBeat).toBe(480);
    const types = parsed.tracks[0]?.map((e) => e.type);
    expect(types?.slice(0, 4)).toEqual(["trackName", "timeSignature", "setTempo", "programChange"]);
    expect(types?.at(-1)).toBe("endOfTrack");
  });

  it("round-trips through readSmf", () => {
    const back = readSmf(writeSmf(song));
    expect(back.tempoBpm).toBeCloseTo(90, 3);
    expect(back.timeSignature).toEqual([4, 4]);
    expect(back.trackName).toBe("Paleta Musical");
    expect(back.notes.map((n) => [n.midi, n.startTick, n.durationTicks])).toEqual([
      [60, 0, 480],
      [64, 0, 480],
      [60, 480, 240],
    ]);
    expect(back.notes[2]?.velocity).toBe(127);
  });

  it("converts seconds to ticks as R21", () => {
    expect(secondsToTicks(1, 120)).toBe(960);
  });
});
