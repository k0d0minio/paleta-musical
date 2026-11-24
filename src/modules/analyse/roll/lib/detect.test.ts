import { describe, expect, it } from "vitest";
import { detectNotes, estimateBpm, mixToMono } from "./detect";
import { frequencyOfMidi } from "./salience";

const SR = 44_100;

/** A synthetic file: each note is a tone with a few harmonics. */
function synth(
  notes: { midi: number; start: number; duration: number; amp?: number }[],
  seconds: number,
): Float32Array {
  const out = new Float32Array(Math.round(seconds * SR));
  for (const n of notes) {
    const f = frequencyOfMidi(n.midi);
    const from = Math.round(n.start * SR);
    const to = Math.min(out.length, Math.round((n.start + n.duration) * SR));
    for (let i = from; i < to; i++) {
      const t = (i - from) / SR;
      const env = Math.min(1, t / 0.005, (to - i) / SR / 0.005);
      const amp = (n.amp ?? 0.4) * env;
      out[i] =
        (out[i] ?? 0) +
        amp *
          (Math.sin(2 * Math.PI * f * t) +
            0.4 * Math.sin(2 * Math.PI * 2 * f * t) +
            0.2 * Math.sin(2 * Math.PI * 3 * f * t));
    }
  }
  return out;
}

describe("R19 note detection", () => {
  // 8 notes, 0.5 s apart (120 BPM would be the default, so use 0.4 s = 150 BPM).
  const melody = [60, 62, 64, 65, 67, 69, 71, 72].map((midi, i) => ({
    midi,
    start: 0.2 + i * 0.4,
    duration: 0.35,
  }));
  const samples = synth(melody, 3.8);

  it("finds each note with its pitch, start and length", () => {
    const result = detectNotes(samples, SR);
    expect(result.notes.map((n) => n.midi)).toEqual(melody.map((n) => n.midi));
    result.notes.forEach((n, i) => {
      const expected = melody[i];
      expect(expected).toBeDefined();
      if (!expected) return;
      expect(Math.abs(n.start - expected.start)).toBeLessThan(0.1);
      expect(Math.abs(n.duration - expected.duration)).toBeLessThan(0.12);
      expect(n.velocity).toBeGreaterThan(60);
      expect(n.velocity).toBeLessThanOrEqual(127);
    });
  });

  it("estimates the BPM from the inter-onset intervals", () => {
    // Onsets on the analysis hop (2029 samples): IOI = 10 hops = 0.46 s → 130 BPM.
    const hop = 2029 / SR;
    const steady = synth(
      Array.from({ length: 8 }, (_, i) => ({
        midi: 60 + i,
        start: 0.2 + i * 10 * hop,
        duration: 0.3,
      })),
      4.4,
    );
    expect(detectNotes(steady, SR).bpm).toBe(130);
    // Off the hop grid, the estimate is within the frame resolution.
    expect(Math.abs(detectNotes(samples, SR).bpm - 150)).toBeLessThanOrEqual(8);
  });

  it("gives the duration and one heatmap frame per hop", () => {
    const result = detectNotes(samples, SR);
    expect(result.duration).toBeCloseTo(3.8, 3);
    expect(result.heatmap.count).toBeGreaterThan(70);
    expect(result.heatmap.frameSeconds).toBeCloseTo(0.046, 3);
  });

  it("reports progress from 5 % to 95 %", () => {
    const progress: number[] = [];
    detectNotes(samples, SR, (p) => progress.push(p));
    expect(progress[0]).toBe(5);
    expect(progress.at(-1)).toBe(95);
    expect(progress.length).toBeGreaterThan(3);
    for (let i = 1; i < progress.length; i++) {
      expect(progress[i]).toBeGreaterThanOrEqual(progress[i - 1] ?? 0);
    }
  });

  it("finds chord notes and gives no sub-harmonic ghosts", () => {
    const chord = synth(
      [60, 64, 67].map((midi) => ({
        midi,
        start: 0.1,
        duration: 1,
        amp: 0.25,
      })),
      1.4,
    );
    const midis = [...new Set(detectNotes(chord, SR).notes.map((n) => n.midi))];
    expect(midis.sort()).toEqual([60, 64, 67]);
  });

  it("finds the lowest and the highest pitch of the roll", () => {
    const edges = synth(
      [
        { midi: 36, start: 0.1, duration: 0.8 },
        { midi: 96, start: 1.2, duration: 0.8 },
      ],
      2.2,
    );
    expect(detectNotes(edges, SR).notes.map((n) => n.midi)).toEqual([36, 96]);
  });

  it("gives no notes for silence", () => {
    const result = detectNotes(new Float32Array(SR), SR);
    expect(result.notes).toEqual([]);
    expect(result.bpm).toBe(120);
  });
});

describe("estimateBpm", () => {
  it("needs 4 onsets", () => {
    expect(estimateBpm([0, 0.5, 1])).toBe(120);
    expect(estimateBpm([0, 0.5, 1, 1.5])).toBe(120);
    expect(estimateBpm([0, 0.6, 1.2, 1.8])).toBe(100);
  });
  it("uses the median and clamps to 60–200", () => {
    expect(estimateBpm([0, 0.25, 0.5, 0.75, 5])).toBe(200);
    expect(estimateBpm([0, 1.5, 3, 4.5])).toBe(60);
    expect(estimateBpm([0, 3, 6, 9])).toBe(120);
  });
});

describe("mixToMono", () => {
  it("averages the channels", () => {
    const mono = mixToMono([
      Float32Array.from([1, 0]),
      Float32Array.from([0, 1]),
    ]);
    expect([...mono]).toEqual([0.5, 0.5]);
  });
});
