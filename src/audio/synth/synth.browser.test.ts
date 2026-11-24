import { describe, expect, it } from "vitest";
import { defaultSound, type SynthSound } from "./params";
import { Synth } from "./synth";

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

function maxAbs(data: Float32Array, fromSec: number, toSec: number): number {
  let max = 0;
  for (let i = Math.floor(fromSec * RATE); i < Math.floor(toSec * RATE); i++)
    max = Math.max(max, Math.abs(data[i] ?? 0));
  return max;
}

function maxStep(data: Float32Array, fromSec: number, toSec: number): number {
  let max = 0;
  for (
    let i = Math.floor(fromSec * RATE) + 1;
    i < Math.floor(toSec * RATE);
    i++
  )
    max = Math.max(max, Math.abs((data[i] ?? 0) - (data[i - 1] ?? 0)));
  return max;
}

/** Two sines in tune, no filter colour, no echo, full volume: easy to measure. */
function plain(patch: Partial<SynthSound["params"]> = {}): SynthSound {
  const base = defaultSound();
  return {
    wave1: "sine",
    wave2: "sine",
    params: {
      ...base.params,
      det: 0,
      cut: 12000,
      res: 0.5,
      fb: 0,
      dm: 0,
      vol: 1,
      ...patch,
    },
  };
}

function offline(seconds: number) {
  const ctx = new OfflineAudioContext(1, Math.ceil(RATE * seconds), RATE);
  const synth = new Synth({
    output: () => ({ ctx, destination: ctx.destination }),
  });
  return { ctx, synth };
}

describe("Synth (offline render)", () => {
  it("sounds two notes together (S010)", async () => {
    const { ctx, synth } = offline(1);
    synth.setSound(plain());
    expect(synth.noteOn(69, 0)).toBe(true);
    expect(synth.noteOn(76, 0)).toBe(true);
    expect(synth.noteOn(69, 0)).toBe(true); // held already: no second voice
    expect([...synth.getHeld()]).toEqual([69, 76]);
    const data = (await ctx.startRendering()).getChannelData(0);
    const window = data.subarray(
      Math.floor(0.4 * RATE),
      Math.floor(0.9 * RATE),
    );
    const a4 = magnitude(window, 440);
    const e5 = magnitude(window, 659.26);
    const between = magnitude(window, 550);
    expect(a4).toBeGreaterThan(between * 20);
    expect(e5).toBeGreaterThan(between * 20);
  });

  // The compressor (S009) adds a fixed make-up gain in Chromium: below its
  // threshold the levels scale, so these tests compare levels with each other.
  it("follows the SR3 envelope: attack, sustain and release", async () => {
    const { ctx, synth } = offline(2.5);
    synth.setSound(plain({ a: 0.05, d: 0.1, s: 0.5, r: 0.4, vol: 0.5 }));
    // The note starts after the compressor has settled.
    synth.noteOn(69, 0.5);
    synth.noteOff(69, 1.5);
    const data = (await ctx.startRendering()).getChannelData(0);
    // The compressor delays its output by a few ms (look-ahead).
    const peak = maxAbs(data, 0.54, 0.57);
    const sustain = maxAbs(data, 1.3, 1.4);
    // Attack: silent at the start, rising to the peak at the end of the attack.
    expect(maxAbs(data, 0.5, 0.502) / peak).toBeLessThan(0.06);
    const early = maxAbs(data, 0.51, 0.52);
    const late = maxAbs(data, 0.53, 0.54);
    expect(early).toBeLessThan(late);
    expect(late).toBeLessThan(peak);
    // Decay to 0.3 × sustain (here half the peak).
    expect(sustain / peak).toBeCloseTo(0.5, 1);
    // Release: time constant release / 4, so e^-1 after 0.1 s and about e^-4 after 0.4 s.
    expect(maxAbs(data, 1.595, 1.605) / sustain).toBeCloseTo(Math.exp(-1), 1);
    expect(maxAbs(data, 1.89, 1.91) / sustain).toBeLessThan(0.03);
    // The voice stops at release × 1.6 + 0.05 s.
    expect(maxAbs(data, 2.2, 2.5)).toBe(0);
  });

  it("changes the volume and the mix without a click (S011, SU4)", async () => {
    const { ctx, synth } = offline(1);
    synth.setSound(plain({ a: 0.005, s: 1, vol: 0.5 }));
    synth.noteOn(57, 0);
    void ctx.suspend(0.5).then(() => {
      synth.setSound(plain({ a: 0.005, s: 1, vol: 0.1, mix: 0 }));
      void ctx.resume();
    });
    const data = (await ctx.startRendering()).getChannelData(0);
    const level = maxAbs(data, 0.3, 0.5);
    // A 220 Hz sine moves at most level × 2π × 220 / 44100 per sample; a click jumps more.
    const smooth = level * ((2 * Math.PI * 220) / RATE) * 1.2;
    expect(maxStep(data, 0.3, 0.5)).toBeLessThan(smooth);
    expect(maxStep(data, 0.5, 0.6)).toBeLessThan(smooth);
    // The new volume: 0.1² / 0.5² of the level.
    expect(maxAbs(data, 0.8, 1) / level).toBeCloseTo(0.04, 2);
  });
});
