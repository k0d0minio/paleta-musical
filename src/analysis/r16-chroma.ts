import { frequencyOfMidi, toPitchClass } from "@/theory";
import {
  magnitudeAt,
  magnitudeSpectrum,
  rms,
  spectralFlatness,
} from "./spectrum";
import type {
  AnalysisHooks,
  Chroma,
  ChromaAggregates,
  NoteStrength,
} from "./types";

/** R16 constants. */
export const R16 = {
  midiLow: 36,
  midiHigh: 95,
  hopSeconds: 0.2,
  minFrames: 6,
  maxFrames: 50,
  gateSamples: 4096,
  gateRms: 1e-4,
  largeFft: 32768,
  smallFft: 8192,
  /** MIDI below this uses the large spectrum (8 harmonics); from it, the small one (5). */
  splitMidi: 72,
  largeHarmonics: 8,
  smallHarmonics: 5,
  /** Harmonics above this fraction of the sample rate are not used. */
  nyquistFraction: 0.47,
  residualSubtract: 0.6,
  residualHarmonics: 8,
  mixOriginal: 0.6,
  mixResidual: 0.4,
  flatnessLowHz: 60,
  flatnessHighHz: 4000,
  minConfidence: 0.1,
} as const;

export class AbortError extends Error {
  constructor() {
    super("Analysis cancelled");
    this.name = "AbortError";
  }
}

/** R16 channels: mono = (L + R) / 2 (the mean of all channels). */
export function mixToMono(channels: readonly Float32Array[]): Float32Array {
  const [first, ...rest] = channels;
  if (!first) return new Float32Array(0);
  if (rest.length === 0) return first;
  const out = new Float32Array(first.length);
  const n = channels.length;
  for (const channel of channels) {
    for (let i = 0; i < out.length; i++)
      out[i] = (out[i] ?? 0) + (channel[i] ?? 0) / n;
  }
  return out;
}

/**
 * R16 frames: count = min(50, max(6, floor(duration / hop))), evenly spaced
 * from the start; a frame that would run past the end (offset + 32768 ≥
 * length) stops the list. Returns the start offsets in samples.
 */
export function frameOffsets(length: number, sampleRate: number): number[] {
  const hop = R16.hopSeconds * sampleRate;
  const count = Math.min(
    R16.maxFrames,
    Math.max(R16.minFrames, Math.floor(length / hop)),
  );
  const step = Math.floor(length / count);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const offset = i * step;
    if (offset + R16.largeFft >= length) break;
    out.push(offset);
  }
  return out;
}

/** R16 harmonic salience: Σ mag(h·f0) / √h, h = 1…harmonics, stopping above 0.47 × sample rate. */
export function harmonicSalience(
  mags: Float64Array,
  f0: number,
  harmonics: number,
  binHz: number,
  sampleRate: number,
): number {
  const limit = R16.nyquistFraction * sampleRate;
  let sum = 0;
  for (let h = 1; h <= harmonics; h++) {
    const f = h * f0;
    if (f > limit) break;
    sum += magnitudeAt(mags, f, binHz) / Math.sqrt(h);
  }
  return sum;
}

/** Subtracts `amount` at a frequency, shared between the two nearest bins like the interpolation (floor 0). */
function subtractAt(
  mags: Float64Array,
  frequency: number,
  binHz: number,
  amount: number,
): void {
  const position = frequency / binHz;
  const i = Math.floor(position);
  if (i < 0 || i + 1 >= mags.length) return;
  const frac = position - i;
  mags[i] = Math.max(0, (mags[i] ?? 0) - amount * (1 - frac));
  mags[i + 1] = Math.max(0, (mags[i + 1] ?? 0) - amount * frac);
}

/**
 * R16 residual. Pitches below MIDI 72 are visited by salience, strongest
 * first. Each pitch reads its salience from the residual spectrum (what
 * stronger pitches left), then removes 0.6 × s/√h at its harmonics 1–8
 * (floor 0). So a pitch that is only a harmonic of a stronger pitch loses
 * most of its salience. Returns the residual salience per pitch.
 */
export function residualSalience(
  large: Float64Array,
  salience: ReadonlyMap<number, number>,
  binHz: number,
  sampleRate: number,
): Map<number, number> {
  const residual = Float64Array.from(large);
  const order = [...salience.entries()]
    .filter(([midi]) => midi < R16.splitMidi)
    .sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const limit = R16.nyquistFraction * sampleRate;
  const out = new Map<number, number>();
  for (const [midi] of order) {
    const f0 = frequencyOfMidi(midi);
    const s = harmonicSalience(
      residual,
      f0,
      R16.largeHarmonics,
      binHz,
      sampleRate,
    );
    out.set(midi, s);
    for (let h = 1; h <= R16.residualHarmonics; h++) {
      const f = h * f0;
      if (f > limit) break;
      subtractAt(residual, f, binHz, (R16.residualSubtract * s) / Math.sqrt(h));
    }
  }
  return out;
}

/** R16 octave weight: MIDI < 60 → 0.25 + 0.75 × (MIDI − 36) / 24, else 1. */
export function octaveWeight(midi: number): number {
  return midi < 60 ? 0.25 + (0.75 * (midi - 36)) / 24 : 1;
}

export interface FrameAnalysis {
  /** Cube root of the weighted salience per pitch class. */
  readonly chroma: Chroma;
  /** max(0.1, 1 − spectral flatness of the large spectrum, 60–4000 Hz). */
  readonly confidence: number;
}

/** R16 for one frame: spectra, salience, residual, octave weight, frame chroma and confidence. */
export function analyseFrame(
  samples: Float32Array,
  offset: number,
  sampleRate: number,
): FrameAnalysis {
  const large = magnitudeSpectrum(samples, offset, R16.largeFft);
  const small = magnitudeSpectrum(samples, offset, R16.smallFft);
  const largeBin = sampleRate / R16.largeFft;
  const smallBin = sampleRate / R16.smallFft;

  const salience = new Map<number, number>();
  for (let midi = R16.midiLow; midi <= R16.midiHigh; midi++) {
    const f0 = frequencyOfMidi(midi);
    salience.set(
      midi,
      midi < R16.splitMidi
        ? harmonicSalience(large, f0, R16.largeHarmonics, largeBin, sampleRate)
        : harmonicSalience(small, f0, R16.smallHarmonics, smallBin, sampleRate),
    );
  }
  const residual = residualSalience(large, salience, largeBin, sampleRate);

  const sums = new Array<number>(12).fill(0);
  for (const [midi, original] of salience) {
    const value =
      midi < R16.splitMidi
        ? R16.mixOriginal * original +
          R16.mixResidual * (residual.get(midi) ?? 0)
        : original;
    const pc = toPitchClass(midi);
    sums[pc] = (sums[pc] ?? 0) + value * octaveWeight(midi);
  }
  const flatness = spectralFlatness(
    large,
    largeBin,
    R16.flatnessLowHz,
    R16.flatnessHighHz,
  );
  return {
    chroma: sums.map((v) => Math.cbrt(v)),
    confidence: Math.max(R16.minConfidence, 1 - flatness),
  };
}

/** R16 aggregate weights for a frame at position 0–1 in the signal. */
export function startWeight(pos: number): number {
  return pos < 0.35 ? (1 - pos / 0.35) * 2 + 1 : 0.1;
}
export function endWeight(pos: number): number {
  return pos > 0.65 ? ((pos - 0.65) / 0.35) * 2 + 1 : 0.1;
}

export function l2Normalise(values: readonly number[]): number[] {
  const norm = Math.sqrt(values.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? values.map((v) => v / norm) : values.map(() => 1 / 12);
}

const UNIFORM: Chroma = new Array<number>(12).fill(1 / 12);

/**
 * R16: the full, start and end chroma of a mono signal. A frame is skipped
 * when the RMS of its first 4096 samples is below 1e-4. The position of a
 * frame is its centre / signal length.
 */
export async function chromaAggregates(
  samples: Float32Array,
  sampleRate: number,
  hooks: AnalysisHooks = {},
): Promise<ChromaAggregates> {
  const offsets = frameOffsets(samples.length, sampleRate);
  const full = new Array<number>(12).fill(0);
  const start = new Array<number>(12).fill(0);
  const end = new Array<number>(12).fill(0);
  let used = 0;
  for (const [i, offset] of offsets.entries()) {
    if (hooks.signal?.aborted) throw new AbortError();
    if (rms(samples, offset, R16.gateSamples) >= R16.gateRms) {
      const frame = analyseFrame(samples, offset, sampleRate);
      const pos = (offset + R16.largeFft / 2) / samples.length;
      const ws = startWeight(pos) * frame.confidence;
      const we = endWeight(pos) * frame.confidence;
      for (let pc = 0; pc < 12; pc++) {
        const c = frame.chroma[pc] ?? 0;
        full[pc] = (full[pc] ?? 0) + c * frame.confidence;
        start[pc] = (start[pc] ?? 0) + c * ws;
        end[pc] = (end[pc] ?? 0) + c * we;
      }
      used += 1;
    }
    hooks.onProgress?.("chroma", (i + 1) / offsets.length);
    await hooks.yieldControl?.();
  }
  if (used === 0)
    return { full: UNIFORM, start: UNIFORM, end: UNIFORM, frames: 0 };
  return {
    full: l2Normalise(full),
    start: l2Normalise(start),
    end: l2Normalise(end),
    frames: used,
  };
}

/** R16 note strengths: the full chroma / its maximum, strongest first (ties: lower pitch class first). */
export function noteStrengths(full: Chroma): NoteStrength[] {
  const max = Math.max(...full);
  return full
    .map((v, pc) => ({ pc: toPitchClass(pc), strength: max > 0 ? v / max : 0 }))
    .sort((a, b) => b.strength - a.strength || a.pc - b.pc);
}
