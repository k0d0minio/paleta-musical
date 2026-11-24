import { describe, expect, it } from "vitest";
import { frequencyOfMidi } from "@/theory";
import { heldChord, render } from "../../tests/fixtures/audio";
import {
  analyseFrame,
  chromaAggregates,
  endWeight,
  frameOffsets,
  harmonicSalience,
  l2Normalise,
  mixToMono,
  noteStrengths,
  octaveWeight,
  R16,
  residualSalience,
  startWeight,
} from "./r16-chroma";
import { magnitudeAt, magnitudeSpectrum, spectralFlatness } from "./spectrum";

const SR = 44100;

function sine(freq: number, seconds: number, amplitude = 0.5, sr = SR) {
  const out = new Float32Array(Math.round(seconds * sr));
  for (let i = 0; i < out.length; i++)
    out[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / sr);
  return out;
}

describe("R16 channels", () => {
  it("mixes to mono as the mean of the channels", () => {
    const mono = mixToMono([Float32Array.of(1, 0.5), Float32Array.of(0, -0.5)]);
    expect([...mono]).toEqual([0.5, 0]);
  });
});

describe("R16 frames", () => {
  it("uses at least 6 and at most 50 frames, 0.2 s apart for mid lengths", () => {
    // 2 s → floor(2 / 0.2) = 10 frames, step 8820; frames stop when offset + 32768 ≥ length.
    const two = frameOffsets(2 * SR, SR);
    expect(two[1]).toBe(8820);
    expect(two.every((o) => o + R16.largeFft < 2 * SR)).toBe(true);
    expect(two).toHaveLength(7);
    // 60 s → min(50, 300) = 50 frames, evenly spaced.
    const long = frameOffsets(60 * SR, SR);
    expect(long).toHaveLength(50);
    expect((long[1] ?? 0) - (long[0] ?? 0)).toBe(Math.floor((60 * SR) / 50));
    // 1 s → max(6, 5) = 6 slots; only those that fit.
    expect(frameOffsets(SR, SR)).toEqual([0, 7350]);
  });

  it("has no frame when the signal is shorter than the large FFT", () => {
    expect(frameOffsets(R16.largeFft - 1, SR)).toEqual([]);
  });
});

describe("R16 spectra", () => {
  it("gives a Hann-windowed magnitude peak at the sine frequency", () => {
    const binHz = SR / R16.largeFft;
    const f = 200 * binHz; // exactly on a bin
    const mags = magnitudeSpectrum(sine(f, 1), 0, R16.largeFft);
    let peak = 0;
    for (let k = 1; k < mags.length; k++)
      if ((mags[k] ?? 0) > (mags[peak] ?? 0)) peak = k;
    expect(peak).toBe(200);
    // |X| / N of a Hann-windowed sine = A / 4.
    expect(mags[200]).toBeCloseTo(0.125, 3);
  });

  it("counts magnitudes at or below −140 dB as 0", () => {
    const mags = magnitudeSpectrum(
      new Float32Array(R16.smallFft),
      0,
      R16.smallFft,
    );
    expect(mags.every((m) => m === 0)).toBe(true);
  });

  it("interpolates linearly between bins", () => {
    const mags = Float64Array.of(0, 1, 3, 0);
    expect(magnitudeAt(mags, 1.25, 1)).toBeCloseTo(1.5);
  });

  it("measures flatness: 1 for a flat spectrum, near 0 for one peak", () => {
    expect(
      spectralFlatness(new Float64Array(100).fill(2), 1, 1, 90),
    ).toBeCloseTo(1);
    const peak = new Float64Array(100);
    peak[50] = 1;
    expect(spectralFlatness(peak, 1, 1, 90)).toBeLessThan(0.01);
  });
});

describe("R16 harmonic salience", () => {
  it("sums mag(h·f0) / √h and stops above 0.47 × sample rate", () => {
    const mags = new Float64Array(1000).fill(1);
    // f0 = 100, bin = 1 Hz, sample rate 1000: harmonics up to 470 Hz → h = 1…4.
    const expected = 1 + 1 / Math.SQRT2 + 1 / Math.sqrt(3) + 1 / 2;
    expect(harmonicSalience(mags, 100, 8, 1, 1000)).toBeCloseTo(expected);
  });

  it("the residual removes a pitch that is only a harmonic of a stronger one", () => {
    // A harmonic tone on C3 (MIDI 48): C4 (60) reads C3's 2nd, 4th… harmonics.
    const signal = render(
      heldChord(0, [], 1).map((e) => ({ ...e, midi: [48] })),
      {
        sampleRate: SR,
        harmonics: 8,
      },
    );
    const large = magnitudeSpectrum(signal, 0, R16.largeFft);
    const binHz = SR / R16.largeFft;
    const salience = new Map<number, number>();
    for (let m = R16.midiLow; m < R16.splitMidi; m++) {
      salience.set(
        m,
        harmonicSalience(large, frequencyOfMidi(m), 8, binHz, SR),
      );
    }
    const residual = residualSalience(large, salience, binHz, SR);
    const c3 = salience.get(48) ?? 0;
    const c4 = salience.get(60) ?? 0;
    expect(c3).toBeGreaterThan(c4);
    // The strongest pitch is visited first: its residual salience is its salience.
    expect(residual.get(48)).toBeCloseTo(c3, 6);
    // Its harmonics are gone from the residual, so C4 keeps little.
    expect(residual.get(60) ?? 0).toBeLessThan(0.25 * c4);
  });
});

describe("R16 octave weight", () => {
  it("rises from 0.25 at MIDI 36 to 1 at MIDI 60", () => {
    expect(octaveWeight(36)).toBe(0.25);
    expect(octaveWeight(48)).toBeCloseTo(0.625);
    expect(octaveWeight(59)).toBeCloseTo(0.96875);
    expect(octaveWeight(60)).toBe(1);
    expect(octaveWeight(95)).toBe(1);
  });
});

describe("R16 frame chroma and confidence", () => {
  it("gives the frame chroma as the cube root of the salience per pitch class", () => {
    const frame = analyseFrame(sine(frequencyOfMidi(69), 1), 0, SR);
    const max = Math.max(...frame.chroma);
    expect(frame.chroma.indexOf(max)).toBe(9);
    expect(frame.chroma).toHaveLength(12);
  });

  it("gives a tone a higher confidence than noise, never below 0.1", () => {
    const tone = analyseFrame(sine(440, 1), 0, SR);
    let seed = 1;
    const noise = new Float32Array(SR).map(() => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647 - 0.5;
    });
    const n = analyseFrame(noise, 0, SR);
    expect(tone.confidence).toBeGreaterThan(0.8);
    expect(n.confidence).toBeLessThan(tone.confidence);
    expect(n.confidence).toBeGreaterThanOrEqual(0.1);
  });
});

describe("R16 aggregates", () => {
  it("weights the start and the end", () => {
    expect(startWeight(0)).toBe(3);
    expect(startWeight(0.175)).toBeCloseTo(2);
    expect(startWeight(0.5)).toBe(0.1);
    expect(endWeight(1)).toBeCloseTo(3);
    expect(endWeight(0.825)).toBeCloseTo(2);
    expect(endWeight(0.5)).toBe(0.1);
  });

  it("L2-normalises", () => {
    const v = l2Normalise([3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(v[0]).toBeCloseTo(0.6);
    expect(v[1]).toBeCloseTo(0.8);
  });

  it("gives the start chroma the first note and the end chroma the last", async () => {
    const c = frequencyOfMidi(60);
    const g = frequencyOfMidi(67);
    const signal = new Float32Array(6 * SR);
    signal.set(sine(c, 3), 0);
    signal.set(sine(g, 3), 3 * SR);
    const agg = await chromaAggregates(signal, SR);
    expect(agg.frames).toBeGreaterThan(0);
    expect(agg.start[0] ?? 0).toBeGreaterThan(agg.start[7] ?? 0);
    expect(agg.end[7] ?? 0).toBeGreaterThan(agg.end[0] ?? 0);
    const norm = Math.sqrt(agg.full.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1);
  });

  it("gives 1/12 everywhere when no frame passes the RMS gate", async () => {
    const agg = await chromaAggregates(new Float32Array(3 * SR), SR);
    expect(agg.frames).toBe(0);
    expect(agg.full.every((v) => v === 1 / 12)).toBe(true);
    expect(agg.start.every((v) => v === 1 / 12)).toBe(true);
  });

  it("gives note strengths relative to the strongest, strongest first", () => {
    const s = noteStrengths([0.2, 0, 0, 0, 0.4, 0, 0, 0.3, 0, 0, 0, 0]);
    expect(s[0]).toEqual({ pc: 4, strength: 1 });
    expect(s[1]?.pc).toBe(7);
    expect(s[1]?.strength).toBeCloseTo(0.75);
    expect(s[2]?.pc).toBe(0);
    expect(s).toHaveLength(12);
  });
});
