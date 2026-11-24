import { describe, expect, it } from "vitest";
import {
  A_MINOR,
  C_MAJOR,
  heldChord,
  render,
} from "../../tests/fixtures/audio";
import { analyseSignal, peaks, sectionBounds, sectionSpan } from "./pipeline";
import { AbortError } from "./r16-chroma";

describe("the pipeline on synthetic files", () => {
  for (const sampleRate of [44100, 48000]) {
    it(`finds C Maior first in a C major file at ${sampleRate} Hz (U23)`, async () => {
      const r = await analyseSignal(
        render(C_MAJOR, { sampleRate }),
        sampleRate,
      );
      expect(r.scales[0]).toMatchObject({
        root: 0,
        scale: "major",
        confidence: 100,
      });
      expect(r.strengths[0]?.pc).toBe(0);
      expect(r.scales.every((s) => s.confidence <= 100)).toBe(true);
    });

    it(`finds A Menor Natural first in an A minor file at ${sampleRate} Hz (U23)`, async () => {
      const r = await analyseSignal(
        render(A_MINOR, { sampleRate }),
        sampleRate,
      );
      expect(r.scales[0]).toMatchObject({ root: 9, scale: "naturalMinor" });
      expect(r.scales.every((s) => s.confidence <= 100)).toBe(true);
    });
  }

  it("finds the held chord first", async () => {
    const sr = 44100;
    const c = await analyseSignal(
      render(heldChord(0, [0, 4, 7], 3), { sampleRate: sr }),
      sr,
    );
    expect(c.chords[0]).toMatchObject({ root: 0, type: "major" });
    const g7 = await analyseSignal(
      render(heldChord(7, [0, 4, 7, 10], 3), { sampleRate: sr }),
      sr,
    );
    expect(g7.chords[0]).toMatchObject({ root: 7, type: "dom7" });
  });

  it("gives one section per window, in order, with a chord per section", async () => {
    const sr = 44100;
    const signal = render(C_MAJOR, { sampleRate: sr });
    const r = await analyseSignal(signal, sr);
    expect(r.sections).toHaveLength(sectionBounds(signal.length, sr).length);
    expect(r.sections[0]?.start).toBe(0);
    expect(r.sections.at(-1)?.end).toBeCloseTo(r.duration);
    expect(r.sections.every((s) => s.chord !== null)).toBe(true);
  });

  it("reports the steps in order and yields between frames", async () => {
    const steps: string[] = [];
    let yields = 0;
    await analyseSignal(
      render(heldChord(0, [0, 4, 7], 2), { sampleRate: 22050 }),
      22050,
      {
        onProgress: (step) => {
          if (steps.at(-1) !== step) steps.push(step);
        },
        yieldControl: () => {
          yields += 1;
        },
      },
    );
    expect(steps).toEqual(["chroma", "scales", "chords", "sections"]);
    expect(yields).toBeGreaterThan(1);
  });

  it("stops with an AbortError when cancelled", async () => {
    const signal = { aborted: false };
    const run = analyseSignal(render(C_MAJOR, { sampleRate: 44100 }), 44100, {
      signal,
      yieldControl: () => {
        signal.aborted = true;
      },
    });
    await expect(run).rejects.toBeInstanceOf(AbortError);
  });

  it("gives no scale and no chord for silence", async () => {
    const r = await analyseSignal(new Float32Array(44100 * 3), 44100);
    expect(r.chroma.frames).toBe(0);
    expect(r.scales).toEqual([]);
    expect(r.chords).toEqual([]);
  });
});

describe("sections and peaks", () => {
  it("splits into windows of at least 1 s, at most 96", () => {
    expect(sectionBounds(44100 * 8, 44100)).toHaveLength(8);
    expect(sectionBounds(44100 * 1, 44100)).toHaveLength(1);
    expect(sectionBounds(1000 * 600, 1000)).toHaveLength(96);
    expect(sectionBounds(0, 44100)).toEqual([]);
  });

  it("lets a section read one large FFT past its window, or move back at the end", () => {
    expect(sectionSpan(0, 44100, 441000)).toEqual([0, 44100 + 32768]);
    expect(sectionSpan(396900, 441000, 441000)).toEqual([
      441000 - 44100 - 32768,
      441000,
    ]);
  });

  it("gives every 1 s window frames, also at 22.05 kHz", async () => {
    const sr = 22050;
    const r = await analyseSignal(render(C_MAJOR, { sampleRate: sr }), sr);
    expect(r.sections).toHaveLength(8);
    expect(r.sections.every((s) => s.chord !== null)).toBe(true);
  });

  it("gives the maximum absolute value per block", () => {
    expect([...peaks(Float32Array.of(0.1, -0.5, 0.2, 0.3), 2)]).toEqual([
      0.5,
      expect.closeTo(0.3) as unknown as number,
    ]);
  });
});
