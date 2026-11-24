import { PitchDetector } from "pitchy";
import { HeatmapBuffer } from "./heatmap";
import { PITCH_COUNT, PITCH_MAX, PITCH_MIN, type RawNote } from "./model";
import { harmonicBins, harmonicSalience, pickPitches } from "./salience";
import { MonoTracker, PolyTracker, type ActiveNote } from "./tracker";

/** R20 constants (live microphone). */
export const R20 = {
  fftSize: 4096,
  smoothing: 0.5,
  pitchLow: 48,
  pitchHigh: 84,
  harmonics: 5,
  floorDb: -120,
  gain: 5,
  trigger: 0.25,
  /** U20: a note ends when its value falls below this (same hysteresis as R19). */
  release: 0.12,
  minGap: 0.05,
  paletteMark: 0.5,
  paletteMarkSeconds: 0.2,
  initialSeconds: 30,
  /** F243: the live spectrum shows 0–5 kHz on −140…0 dB. */
  spectrumMaxHz: 5000,
  spectrumMinDb: -140,
} as const;

/** Monophonic (pitchy) thresholds. */
export const MONO = {
  clarity: 0.9,
  minRms: 0.01,
  confirmFrames: 2,
  minSeconds: 0.05,
} as const;

export interface LiveFrame {
  /** Real time of the frame, in seconds since the capture started (U20). */
  readonly t: number;
  /** AnalyserNode float frequency data (dB per bin). */
  readonly db: Float32Array;
  /** AnalyserNode float time-domain data (for the monophonic mode). */
  readonly wave: Float32Array;
}

export interface LiveResult {
  /** Pitch classes louder than 50 % in this frame (F244: palette mark). */
  readonly loud: number[];
}

/**
 * Live analysis (R20) of one capture. Pure: it takes analyser frames with
 * their real times and keeps the heatmap and the notes. A new capture makes
 * a new `LiveAnalysis`, so nothing leaks between captures (U20).
 */
export class LiveAnalysis {
  readonly heatmap = new HeatmapBuffer(2048);
  readonly #mode: "mono" | "poly";
  readonly #bins: Int32Array;
  readonly #magnitude: Float32Array;
  readonly #salience = new Float32Array(PITCH_COUNT);
  readonly #fundamental = new Float32Array(PITCH_COUNT);
  readonly #values = new Float32Array(PITCH_COUNT);
  readonly #picked = new Float32Array(PITCH_COUNT);
  readonly #poly = new PolyTracker({
    on: R20.trigger,
    off: R20.release,
    minFrames: 2,
    minGap: R20.minGap,
  });
  readonly #mono = new MonoTracker({
    confirmFrames: MONO.confirmFrames,
    minSeconds: MONO.minSeconds,
  });
  #pitch: PitchDetector<Float32Array> | null = null;
  readonly #sampleRate: number;
  #lastT = 0;

  constructor(mode: "mono" | "poly", sampleRate: number) {
    this.#mode = mode;
    this.#sampleRate = sampleRate;
    this.#bins = harmonicBins(sampleRate, R20.fftSize, R20.harmonics);
    this.#magnitude = new Float32Array(R20.fftSize / 2);
  }

  get mode(): "mono" | "poly" {
    return this.#mode;
  }

  /** Feeds one analyser frame. */
  push(frame: LiveFrame): LiveResult {
    const { t, db } = frame;
    this.#lastT = t;
    for (let k = 0; k < this.#magnitude.length; k++) {
      const d = db[k] ?? -Infinity;
      this.#magnitude[k] = d > R20.floorDb ? 10 ** (d / 20) : 0;
    }
    const low = R20.pitchLow - PITCH_MIN;
    const high = R20.pitchHigh - PITCH_MIN;
    harmonicSalience(
      this.#magnitude,
      this.#bins,
      R20.harmonics,
      this.#salience,
      this.#fundamental,
      [low, high],
    );
    for (let p = 0; p < PITCH_COUNT; p++) {
      this.#values[p] = Math.min(1, R20.gain * (this.#salience[p] ?? 0));
    }
    this.heatmap.push(t, this.#values);

    const loud = new Set<number>();
    if (this.#mode === "poly") {
      pickPitches(
        this.#values,
        this.#salience,
        this.#fundamental,
        this.#picked,
      );
      this.#poly.update(t, this.#picked);
      for (let p = 0; p < PITCH_COUNT; p++) {
        if ((this.#picked[p] ?? 0) > R20.paletteMark)
          loud.add((PITCH_MIN + p) % 12);
      }
    } else {
      const { midi, level } = this.#monoPitch(frame.wave);
      this.#mono.update(t, midi, level);
      if (midi !== null && level > R20.paletteMark) loud.add(midi % 12);
    }
    return { loud: [...loud] };
  }

  /** Ends every sounding note (the capture stops). */
  finish(t = this.#lastT): void {
    this.#poly.finish(t);
    this.#mono.finish(t);
  }

  notes(): RawNote[] {
    return this.#mode === "poly" ? this.#poly.notes : this.#mono.notes;
  }

  active(): ActiveNote[] {
    return this.#mode === "poly" ? this.#poly.active() : this.#mono.active();
  }

  #monoPitch(wave: Float32Array): { midi: number | null; level: number } {
    if (wave.length === 0) return { midi: null, level: 0 };
    if (!this.#pitch || this.#pitch.inputLength !== wave.length) {
      this.#pitch = PitchDetector.forFloat32Array(wave.length);
    }
    let sum = 0;
    for (const v of wave) sum += v * v;
    const rms = Math.sqrt(sum / wave.length);
    const level = Math.min(1, rms * 4);
    if (rms < MONO.minRms) return { midi: null, level };
    const [hz, clarity] = this.#pitch.findPitch(wave, this.#sampleRate);
    if (clarity < MONO.clarity || !(hz > 0)) return { midi: null, level };
    const midi = Math.round(69 + 12 * Math.log2(hz / 440));
    if (midi < PITCH_MIN || midi > PITCH_MAX) return { midi: null, level };
    return { midi, level };
  }
}
