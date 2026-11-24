/**
 * Synthetic test audio, rendered in code (no third-party recordings): notes
 * with harmonics and a decay, chord progressions, and a 16-bit PCM WAV encoder.
 */

export interface ToneEvent {
  /** MIDI note numbers that sound together. */
  readonly midi: readonly number[];
  readonly start: number;
  readonly duration: number;
}

export interface RenderOptions {
  readonly sampleRate: number;
  /** Number of harmonics per note (amplitude 1/h). */
  readonly harmonics?: number;
  readonly gain?: number;
}

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Renders events into a mono signal. */
export function render(
  events: readonly ToneEvent[],
  { sampleRate, harmonics = 6, gain = 0.15 }: RenderOptions,
): Float32Array {
  const end = Math.max(...events.map((e) => e.start + e.duration));
  const out = new Float32Array(Math.ceil(end * sampleRate));
  for (const event of events) {
    const from = Math.round(event.start * sampleRate);
    const length = Math.round(event.duration * sampleRate);
    for (const midi of event.midi) {
      const f0 = freq(midi);
      for (let h = 1; h <= harmonics; h++) {
        const f = f0 * h;
        if (f > sampleRate * 0.45) break;
        const w = (2 * Math.PI * f) / sampleRate;
        const a = gain / h;
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          const envelope = Math.min(1, t / 0.01) * Math.exp(-1.2 * t);
          const j = from + i;
          out[j] = (out[j] ?? 0) + a * envelope * Math.sin(w * i);
        }
      }
    }
  }
  return out;
}

/** A chord: a bass root in octave 3 and the chord tones from octave 4 (MIDI 60 = C4). */
function chord(rootPc: number, intervals: readonly number[]): number[] {
  const root = 60 + rootPc;
  return [root - 12, ...intervals.map((i) => root + i)];
}

const MAJ = [0, 4, 7];
const MIN = [0, 3, 7];

/** Builds a progression: one chord per `seconds`, repeated `times`. */
export function progression(
  chords: readonly number[][],
  seconds = 1,
  times = 2,
): ToneEvent[] {
  const out: ToneEvent[] = [];
  for (let r = 0; r < times; r++) {
    for (const [i, midi] of chords.entries()) {
      out.push({
        midi,
        start: (r * chords.length + i) * seconds,
        duration: seconds,
      });
    }
  }
  return out;
}

/** C major: C – F – G – C. */
export const C_MAJOR = progression([
  chord(0, MAJ),
  chord(5, MAJ),
  chord(7, MAJ),
  chord(0, MAJ),
]);
/** A natural minor: Am – Dm – Em – Am. */
export const A_MINOR = progression([
  chord(9, MIN),
  chord(2, MIN),
  chord(4, MIN),
  chord(9, MIN),
]);

/** One chord held for `seconds`. */
export function heldChord(
  rootPc: number,
  intervals: readonly number[],
  seconds: number,
): ToneEvent[] {
  return [{ midi: chord(rootPc, intervals), start: 0, duration: seconds }];
}

/** Encodes a mono signal as a 16-bit PCM WAV file. */
export function encodeWav(
  samples: Float32Array,
  sampleRate: number,
): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++)
      view.setUint8(offset + i, s.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    view.setInt16(44 + i * 2, Math.round(s * 32767), true);
  }
  return bytes;
}
