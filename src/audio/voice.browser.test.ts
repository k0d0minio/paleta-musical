import { describe, expect, it } from "vitest";
import { frequency } from "@/theory";
import { AudioEngine } from "./engine";
import { R15 } from "./r15";
import { scheduleVoice } from "./voice";

const RATE = 44_100;

/** Magnitude of one frequency in a signal window (Goertzel, Hann window). */
function magnitude(samples: Float32Array, freq: number): number {
  const n = samples.length;
  const k = (2 * Math.PI * freq) / RATE;
  let re = 0;
  let im = 0;
  for (let i = 0; i < n; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    const x = (samples[i] ?? 0) * w;
    re += x * Math.cos(k * i);
    im -= x * Math.sin(k * i);
  }
  return Math.hypot(re, im);
}

function peakFrequency(
  samples: Float32Array,
  from: number,
  to: number,
  step: number,
): number {
  let best = from;
  let bestMag = -1;
  for (let f = from; f <= to; f += step) {
    const m = magnitude(samples, f);
    if (m > bestMag) {
      bestMag = m;
      best = f;
    }
  }
  return best;
}

function maxAbs(samples: Float32Array, fromSec: number, toSec: number): number {
  let max = 0;
  for (let i = Math.floor(fromSec * RATE); i < Math.floor(toSec * RATE); i++) {
    max = Math.max(max, Math.abs(samples[i] ?? 0));
  }
  return max;
}

describe("R15 synth voice (offline render)", () => {
  it("renders C4 with its peak at 261.6 Hz ± 1 Hz and the R15 envelope", async () => {
    const ctx = new OfflineAudioContext(1, Math.ceil(RATE * 1.6), RATE);
    scheduleVoice(
      ctx,
      ctx.destination,
      frequency({ pc: 0, octave: 4 }),
      0,
      R15.note,
    );
    const buffer = await ctx.startRendering();
    const data = buffer.getChannelData(0);

    const window = data.subarray(
      Math.floor(0.02 * RATE),
      Math.floor(1.02 * RATE),
    );
    const peak = peakFrequency(window, 250, 275, 0.05);
    expect(Math.abs(peak - 261.63)).toBeLessThanOrEqual(1);

    // Attack: silent at the start, at full volume (0.32) after 10 ms.
    expect(maxAbs(data, 0, 0.001)).toBeLessThan(0.05);
    expect(maxAbs(data, 0.008, 0.014)).toBeGreaterThan(0.28);
    expect(maxAbs(data, 0.008, 0.014)).toBeLessThanOrEqual(0.33);
    // Exponential decay: about half way it is well below the peak, at the end near 0.001.
    expect(maxAbs(data, 0.7, 0.72)).toBeLessThan(0.05);
    expect(maxAbs(data, 1.38, 1.4)).toBeLessThan(0.003);
  });

  it("plays a note through the engine (master gain and limiter)", async () => {
    const ctx = new OfflineAudioContext(1, RATE, RATE);
    const engine = new AudioEngine({
      createContext: () => ctx as unknown as AudioContext,
    });
    engine.playNote({ pc: 9, octave: 4 });
    const data = (await ctx.startRendering()).getChannelData(0);
    const peak = peakFrequency(
      data.subarray(Math.floor(0.02 * RATE), Math.floor(0.82 * RATE)),
      430,
      450,
      0.05,
    );
    expect(Math.abs(peak - 440)).toBeLessThanOrEqual(1);
  });

  it("plays a chord with the R15 chord volume per voice", async () => {
    const ctx = new OfflineAudioContext(1, RATE, RATE);
    scheduleVoice(ctx, ctx.destination, 261.63, 0, R15.chord);
    const data = (await ctx.startRendering()).getChannelData(0);
    expect(maxAbs(data, 0.013, 0.02)).toBeGreaterThan(0.16);
    expect(maxAbs(data, 0.013, 0.02)).toBeLessThanOrEqual(0.19);
  });
});
