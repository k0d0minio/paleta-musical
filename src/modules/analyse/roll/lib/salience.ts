import { PITCH_COUNT, PITCH_MIN } from "./model";

/**
 * Harmonic pitch salience shared by R19 (file) and R20 (microphone).
 *
 * R19 and R20 sum the magnitude of the harmonics of each pitch. A plain sum
 * also gives a high value to the sub-harmonics of a note (a sine at A4 lifts
 * A3, D3, A2… through their 2nd, 3rd, 4th harmonics), and adjacent low pitches
 * share an FFT bin. Two checks remove those ghosts before a note starts (the
 * heatmap still shows the plain values):
 * - the fundamental itself must carry energy (≥ FUNDAMENTAL_SHARE of the sum);
 * - the pitch must be a local peak against its two neighbours;
 * - a pitch at the 2nd to 6th harmonic of a lower kept pitch must have a
 *   fundamental of at least HARMONIC_SHARE of that pitch's fundamental (else
 *   it is that pitch's overtone, not a note).
 */
export const FUNDAMENTAL_SHARE = 0.2;
export const HARMONIC_SHARE = 0.7;
const OVERTONE_INTERVALS = [12, 19, 24, 28, 31] as const;

export function frequencyOfMidi(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** For each pitch of the roll, the FFT bin of harmonics 1…harmonics (−1 above Nyquist). */
export function harmonicBins(
  sampleRate: number,
  fftSize: number,
  harmonics: number,
): Int32Array {
  const bins = new Int32Array(PITCH_COUNT * harmonics);
  const binWidth = sampleRate / fftSize;
  for (let p = 0; p < PITCH_COUNT; p++) {
    const f = frequencyOfMidi(PITCH_MIN + p);
    for (let h = 1; h <= harmonics; h++) {
      const bin = Math.round((f * h) / binWidth);
      bins[p * harmonics + h - 1] = bin < fftSize / 2 ? bin : -1;
    }
  }
  return bins;
}

/**
 * Salience of each pitch: Σ magnitude(bin of harmonic h) / √h. `magnitude`
 * is per bin (linear). `fundamental` receives the magnitude of harmonic 1.
 */
export function harmonicSalience(
  magnitude: ArrayLike<number>,
  bins: Int32Array,
  harmonics: number,
  out: Float32Array,
  fundamental: Float32Array,
  pitchRange: readonly [number, number] = [0, PITCH_COUNT - 1],
): void {
  out.fill(0);
  fundamental.fill(0);
  for (let p = pitchRange[0]; p <= pitchRange[1]; p++) {
    let sum = 0;
    for (let h = 1; h <= harmonics; h++) {
      const bin = bins[p * harmonics + h - 1] ?? -1;
      if (bin < 0) continue;
      const m = magnitude[bin] ?? 0;
      if (h === 1) fundamental[p] = m;
      sum += m / Math.sqrt(h);
    }
    out[p] = sum;
  }
}

/**
 * The ghost filter (see above): returns the values with every pitch that is
 * not a real candidate set to 0.
 */
export function pickPitches(
  values: Float32Array,
  salience: Float32Array,
  fundamental: Float32Array,
  out: Float32Array,
): void {
  for (let p = 0; p < PITCH_COUNT; p++) {
    const s = salience[p] ?? 0;
    const left = p > 0 ? (salience[p - 1] ?? 0) : -1;
    const right = p < PITCH_COUNT - 1 ? (salience[p + 1] ?? 0) : -1;
    const isPeak = s >= left && s > right;
    const hasFundamental = (fundamental[p] ?? 0) >= FUNDAMENTAL_SHARE * s;
    out[p] = s > 0 && isPeak && hasFundamental ? (values[p] ?? 0) : 0;
  }
  // Ascending: a lower pitch is final before its overtones are checked.
  for (let p = 0; p < PITCH_COUNT; p++) {
    if ((out[p] ?? 0) === 0) continue;
    const f = fundamental[p] ?? 0;
    for (const interval of OVERTONE_INTERVALS) {
      const q = p - interval;
      if (q < 0 || (out[q] ?? 0) === 0) continue;
      if (f < HARMONIC_SHARE * (fundamental[q] ?? 0)) {
        out[p] = 0;
        break;
      }
    }
  }
}
