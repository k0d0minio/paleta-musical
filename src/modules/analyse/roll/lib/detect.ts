import FFT from "fft.js";
import type { Heatmap } from "./heatmap";
import { PITCH_COUNT, type RawNote } from "./model";
import { harmonicBins, harmonicSalience, pickPitches } from "./salience";
import { PolyTracker } from "./tracker";

/** R19 constants. */
export const R19 = {
  windowSize: 4096,
  hopSeconds: 0.046,
  harmonics: 6,
  keepAbove: 0.01,
  gain: 3.5,
  onset: 0.28,
  release: 0.12,
  minFrames: 3,
  progressEvery: 20,
  progressFrom: 5,
  progressTo: 95,
} as const;

export interface DetectResult {
  readonly notes: RawNote[];
  /** R19 BPM estimate. */
  readonly bpm: number;
  /** File length in seconds. */
  readonly duration: number;
  readonly heatmap: Heatmap;
}

/** Mixes the channels of a file to one mono signal. */
export function mixToMono(channels: readonly Float32Array[]): Float32Array {
  const first = channels[0];
  if (!first) return new Float32Array(0);
  if (channels.length === 1) return first.slice();
  const out = new Float32Array(first.length);
  for (const channel of channels) {
    for (let i = 0; i < out.length; i++)
      out[i] = (out[i] ?? 0) + (channel[i] ?? 0);
  }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) / channels.length;
  return out;
}

/**
 * R19 BPM estimate: median of the first ≤ 29 inter-onset intervals; if it is
 * 0.1–2.0 s, 60/IOI clamped to 60–200; else (or with < 4 onsets) 120.
 */
export function estimateBpm(onsets: readonly number[]): number {
  const sorted = [
    ...new Set(onsets.map((t) => Math.round(t * 1000) / 1000)),
  ].sort((a, b) => a - b);
  if (sorted.length < 4) return 120;
  const iois: number[] = [];
  for (let i = 1; i < sorted.length && iois.length < 29; i++) {
    iois.push((sorted[i] ?? 0) - (sorted[i - 1] ?? 0));
  }
  iois.sort((a, b) => a - b);
  const mid = iois.length >> 1;
  const median =
    iois.length % 2 === 1
      ? (iois[mid] ?? 0)
      : ((iois[mid - 1] ?? 0) + (iois[mid] ?? 0)) / 2;
  if (median < 0.1 || median > 2.0) return 120;
  return Math.min(200, Math.max(60, Math.round(60 / median)));
}

/**
 * R19 note-event detection on a mono signal. Pure: it runs in the worker and
 * in tests. `onProgress` gets 5…95 % every 20 frames (F238).
 */
export function detectNotes(
  samples: Float32Array,
  sampleRate: number,
  onProgress?: (percent: number) => void,
): DetectResult {
  const n = R19.windowSize;
  const hop = Math.max(1, Math.round(R19.hopSeconds * sampleRate));
  const hopSeconds = hop / sampleRate;
  const frames =
    samples.length <= n ? 1 : Math.floor((samples.length - n) / hop) + 1;

  const window = new Float64Array(n);
  let windowSum = 0;
  for (let i = 0; i < n; i++) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    windowSum += window[i] ?? 0;
  }
  // A sine of amplitude A gives a bin magnitude of about A.
  const scale = 2 / windowSum;

  const fft = new FFT(n);
  const input = new Float64Array(n);
  const spectrum = fft.createComplexArray() as number[];
  const magnitude = new Float32Array(n / 2);
  const bins = harmonicBins(sampleRate, n, R19.harmonics);
  const salience = new Float32Array(PITCH_COUNT);
  const fundamental = new Float32Array(PITCH_COUNT);
  const values = new Float32Array(PITCH_COUNT);
  const picked = new Float32Array(PITCH_COUNT);

  const times = new Float64Array(frames);
  const heat = new Float32Array(frames * PITCH_COUNT);
  const tracker = new PolyTracker({
    on: R19.onset,
    off: R19.release,
    minFrames: R19.minFrames,
    minGap: 0,
  });

  onProgress?.(R19.progressFrom);
  for (let f = 0; f < frames; f++) {
    const offset = f * hop;
    for (let i = 0; i < n; i++) {
      input[i] = (samples[offset + i] ?? 0) * (window[i] ?? 0);
    }
    fft.realTransform(spectrum, input);
    for (let k = 0; k < n / 2; k++) {
      const re = spectrum[2 * k] ?? 0;
      const im = spectrum[2 * k + 1] ?? 0;
      magnitude[k] = Math.hypot(re, im) * scale;
    }
    harmonicSalience(magnitude, bins, R19.harmonics, salience, fundamental);
    for (let p = 0; p < PITCH_COUNT; p++) {
      const s = salience[p] ?? 0;
      values[p] = s > R19.keepAbove ? Math.min(1, R19.gain * s) : 0;
    }
    pickPitches(values, salience, fundamental, picked);

    const t = f * hopSeconds;
    times[f] = t;
    heat.set(values, f * PITCH_COUNT);
    tracker.update(t, picked);

    if (onProgress && f > 0 && f % R19.progressEvery === 0) {
      onProgress(
        R19.progressFrom + ((R19.progressTo - R19.progressFrom) * f) / frames,
      );
    }
  }
  const duration = samples.length / sampleRate;
  tracker.finish(Math.min(duration, frames * hopSeconds));
  onProgress?.(R19.progressTo);

  const notes = tracker.notes.sort(
    (a, b) => a.start - b.start || a.midi - b.midi,
  );
  return {
    notes,
    bpm: estimateBpm(notes.map((x) => x.start)),
    duration,
    heatmap: { count: frames, times, values: heat, frameSeconds: hopSeconds },
  };
}
