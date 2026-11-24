import FFT from "fft.js";

/** R16: magnitudes at or below this level (dB) count as 0. */
export const DB_FLOOR = -140;

const ffts = new Map<
  number,
  { fft: FFT; out: Float64Array; input: Float64Array }
>();
const windows = new Map<number, Float64Array>();

function hann(size: number): Float64Array {
  let w = windows.get(size);
  if (!w) {
    w = new Float64Array(size);
    for (let i = 0; i < size; i++) {
      w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
    }
    windows.set(size, w);
  }
  return w;
}

function fftOf(size: number) {
  let entry = ffts.get(size);
  if (!entry) {
    entry = {
      fft: new FFT(size),
      out: new Float64Array(size * 2),
      input: new Float64Array(size),
    };
    ffts.set(size, entry);
  }
  return entry;
}

/**
 * R16 spectra: the Hann-windowed magnitude spectrum of `size` samples from
 * `offset` (bins 0…size/2). The magnitude is |X| / size; a magnitude at or
 * below −140 dB is 0. Samples past the end of the signal count as 0.
 */
export function magnitudeSpectrum(
  samples: Float32Array,
  offset: number,
  size: number,
): Float64Array {
  const { fft, out, input } = fftOf(size);
  const w = hann(size);
  const available = Math.max(0, Math.min(size, samples.length - offset));
  for (let i = 0; i < available; i++)
    input[i] = (samples[offset + i] ?? 0) * (w[i] ?? 0);
  input.fill(0, available);
  fft.realTransform(out, input);
  const half = size / 2;
  const mags = new Float64Array(half + 1);
  const floor = 10 ** (DB_FLOOR / 20);
  for (let k = 0; k <= half; k++) {
    const re = out[2 * k] ?? 0;
    const im = out[2 * k + 1] ?? 0;
    const m = Math.sqrt(re * re + im * im) / size;
    mags[k] = m <= floor ? 0 : m;
  }
  return mags;
}

/** Magnitude at a frequency, with linear interpolation between the two nearest bins. */
export function magnitudeAt(
  mags: Float64Array,
  frequency: number,
  binHz: number,
): number {
  const position = frequency / binHz;
  const i = Math.floor(position);
  if (i < 0 || i + 1 >= mags.length) return 0;
  const frac = position - i;
  return (mags[i] ?? 0) * (1 - frac) + (mags[i + 1] ?? 0) * frac;
}

/** Root mean square of `count` samples from `offset`. */
export function rms(
  samples: Float32Array,
  offset: number,
  count: number,
): number {
  const end = Math.min(samples.length, offset + count);
  if (end <= offset) return 0;
  let sum = 0;
  for (let i = offset; i < end; i++) {
    const s = samples[i] ?? 0;
    sum += s * s;
  }
  return Math.sqrt(sum / (end - offset));
}

/**
 * Spectral flatness (geometric mean / arithmetic mean) of the magnitudes
 * between two frequencies. 1 = white noise, 0 = pure tones.
 */
export function spectralFlatness(
  mags: Float64Array,
  binHz: number,
  lowHz: number,
  highHz: number,
): number {
  const lo = Math.max(1, Math.ceil(lowHz / binHz));
  const hi = Math.min(mags.length - 1, Math.floor(highHz / binHz));
  if (hi < lo) return 1;
  let logSum = 0;
  let sum = 0;
  const eps = 1e-12;
  for (let k = lo; k <= hi; k++) {
    const m = (mags[k] ?? 0) + eps;
    logSum += Math.log(m);
    sum += m;
  }
  const n = hi - lo + 1;
  const arithmetic = sum / n;
  return arithmetic > 0 ? Math.exp(logSum / n) / arithmetic : 1;
}
