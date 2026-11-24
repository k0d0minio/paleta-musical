import { frequencyOfMidi } from "@/theory";
import type { Voice } from "../voice";
import {
  defaultSound,
  mixGains,
  volumeGain,
  type SynthSound,
  type Waveform,
} from "./params";

/** SR3: the envelope peak of one voice. */
export const ENVELOPE_PEAK = 0.3;
/** S011: smoothing time constants (about 95 % of a change within 20 ms and 50 ms). */
const SMOOTH = 0.02 / 3;
const SMOOTH_DELAY = 0.05 / 3;
/** SR4: the longest delay time. */
const MAX_DELAY_SECONDS = 1;
/** S029: the analyser frame. */
export const SCOPE_FRAME = 2048;

export interface SynthOutput {
  readonly ctx: BaseAudioContext;
  /** Where the synth sends its final mix (the engine's master input). */
  readonly destination: AudioNode;
}

export interface SynthDeps {
  /** Gives the context and the destination, or null when there is no audio. */
  output(): SynthOutput | null;
}

interface Graph {
  readonly ctx: BaseAudioContext;
  readonly bus: GainNode;
  readonly filter: BiquadFilterNode;
  readonly volume: GainNode;
  readonly delay: DelayNode;
  readonly feedback: GainNode;
  readonly wet: GainNode;
  readonly analyser: AnalyserNode;
  readonly nodes: readonly AudioNode[];
}

/** One note: two oscillators, their mix gains and the amplitude envelope (SR3, SR4). */
class SynthVoice {
  readonly ended: Promise<void>;
  #osc1: OscillatorNode;
  #osc2: OscillatorNode;
  #g1: GainNode;
  #g2: GainNode;
  #env: GainNode;
  #released = false;

  constructor(
    ctx: BaseAudioContext,
    destination: AudioNode,
    f: number,
    when: number,
    sound: SynthSound,
    peak = ENVELOPE_PEAK,
  ) {
    const { params } = sound;
    const [m1, m2] = mixGains(params.mix);
    this.#osc1 = ctx.createOscillator();
    this.#osc2 = ctx.createOscillator();
    this.#g1 = ctx.createGain();
    this.#g2 = ctx.createGain();
    this.#env = ctx.createGain();
    this.#osc1.type = sound.wave1;
    this.#osc2.type = sound.wave2;
    this.#osc1.frequency.value = f;
    this.#osc2.frequency.value = f;
    this.#osc2.detune.value = params.det;
    this.#g1.gain.value = m1;
    this.#g2.gain.value = m2;

    // SR3: linear attack to the peak, then an exponential approach to the sustain level.
    const env = this.#env.gain;
    env.setValueAtTime(0, when);
    env.linearRampToValueAtTime(peak, when + params.a);
    env.setTargetAtTime(peak * params.s, when + params.a, params.d / 3);

    this.#osc1.connect(this.#g1).connect(this.#env);
    this.#osc2.connect(this.#g2).connect(this.#env);
    this.#env.connect(destination);
    this.#osc1.start(when);
    this.#osc2.start(when);

    this.ended = new Promise<void>((resolve) => {
      this.#osc1.onended = () => {
        for (const node of [
          this.#osc1,
          this.#osc2,
          this.#g1,
          this.#g2,
          this.#env,
        ])
          node.disconnect();
        resolve();
      };
    });
  }

  get released(): boolean {
    return this.#released;
  }

  setWaves(wave1: Waveform, wave2: Waveform): void {
    this.#osc1.type = wave1;
    this.#osc2.type = wave2;
  }

  /** SU4: mix and detune changes are smoothed on the notes that sound. */
  setMix(mix: number, at: number): void {
    const [m1, m2] = mixGains(mix);
    this.#g1.gain.setTargetAtTime(m1, at, SMOOTH);
    this.#g2.gain.setTargetAtTime(m2, at, SMOOTH);
  }

  setDetune(cents: number, at: number): void {
    this.#osc2.detune.setTargetAtTime(cents, at, SMOOTH);
  }

  /** SR3: from the current level, an exponential approach to 0 (time constant release / 4). */
  release(at: number, release: number): void {
    if (this.#released) return;
    this.#released = true;
    this.#fadeOut(at, release / 4, release * 1.6 + 0.05);
  }

  /** Stop-all: a fast fade, no click. */
  stop(at: number): void {
    this.#released = true;
    this.#fadeOut(at, 0.015, 0.08);
  }

  #fadeOut(at: number, timeConstant: number, stopAfter: number): void {
    const gain = this.#env.gain;
    try {
      if (typeof gain.cancelAndHoldAtTime === "function") {
        gain.cancelAndHoldAtTime(at);
      } else {
        const level = gain.value;
        gain.cancelScheduledValues(at);
        gain.setValueAtTime(level, at);
      }
      gain.setTargetAtTime(0, at, timeConstant);
      this.#osc1.stop(at + stopAfter);
      this.#osc2.stop(at + stopAfter);
    } catch {
      // The voice already stopped.
    }
  }
}

export type HeldNotes = ReadonlySet<number>;

/**
 * The synth of the Sintetizador module (S001–S012, SR3, SR4): a polyphonic
 * two-oscillator voice, a low-pass filter, an echo, a volume, a compressor
 * and an analyser for the oscilloscope. It builds its graph on the first note
 * (S012); parameter changes before that are kept and applied then.
 */
export class Synth {
  #sound: SynthSound = defaultSound();
  #graph: Graph | null = null;
  #held = new Map<number, SynthVoice>();
  #voices = new Set<SynthVoice>();
  #heldSnapshot: HeldNotes = new Set();
  #listeners = new Set<() => void>();

  constructor(private readonly deps: SynthDeps) {}

  get sound(): SynthSound {
    return this.#sound;
  }

  /** The analyser of the output (S029), or null before the audio starts. */
  get analyser(): AnalyserNode | null {
    return this.#graph?.analyser ?? null;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  /** The MIDI notes that are held now (S028). */
  getHeld = (): HeldNotes => this.#heldSnapshot;

  /** Sets the sound. Changes apply at once and smoothed (S002, S004, S011). */
  setSound(sound: SynthSound): void {
    const previous = this.#sound;
    this.#sound = sound;
    const graph = this.#graph;
    if (!graph) return;
    const now = graph.ctx.currentTime;
    const { params } = sound;
    if (sound.wave1 !== previous.wave1 || sound.wave2 !== previous.wave2) {
      for (const voice of this.#voices)
        voice.setWaves(sound.wave1, sound.wave2);
    }
    if (params.mix !== previous.params.mix) {
      for (const voice of this.#voices) voice.setMix(params.mix, now);
    }
    if (params.det !== previous.params.det) {
      for (const voice of this.#voices) voice.setDetune(params.det, now);
    }
    graph.filter.frequency.setTargetAtTime(params.cut, now, SMOOTH);
    graph.filter.Q.setTargetAtTime(params.res, now, SMOOTH);
    graph.volume.gain.setTargetAtTime(volumeGain(params.vol), now, SMOOTH);
    graph.delay.delayTime.setTargetAtTime(params.dt, now, SMOOTH_DELAY);
    graph.feedback.gain.setTargetAtTime(params.fb, now, SMOOTH);
    graph.wet.gain.setTargetAtTime(params.dm, now, SMOOTH);
  }

  /** S010: plays a note; a note that is held already does nothing. Returns false without audio. */
  noteOn(midi: number, when?: number): boolean {
    if (this.#held.has(midi)) return true;
    const graph = this.#ensureGraph();
    if (!graph) return false;
    const start = when ?? graph.ctx.currentTime + 0.005;
    try {
      const voice = new SynthVoice(
        graph.ctx,
        graph.bus,
        frequencyOfMidi(midi), // SR3
        start,
        this.#sound,
      );
      this.#held.set(midi, voice);
      this.#voices.add(voice);
      void voice.ended.then(() => this.#voices.delete(voice));
    } catch {
      return false;
    }
    this.#emitHeld();
    return true;
  }

  noteOff(midi: number, when?: number): void {
    const voice = this.#held.get(midi);
    if (!voice) return;
    this.#held.delete(midi);
    const graph = this.#graph;
    if (graph) {
      voice.release(
        Math.max(when ?? 0, graph.ctx.currentTime),
        this.#sound.params.r,
      );
    }
    this.#emitHeld();
  }

  /**
   * The synth as an instrument of the other modules: one note with the
   * current sound, released so that it ends near `duration`. `volume` is the
   * envelope peak (the R15 note and chord levels). Null when the synth graph
   * is not on this context.
   */
  playOnce(
    ctx: BaseAudioContext,
    frequency: number,
    when: number,
    duration: number,
    volume: number,
  ): Voice | null {
    const graph = this.#ensureGraph();
    if (graph?.ctx !== ctx) return null;
    const { params } = this.#sound;
    const voice = new SynthVoice(
      ctx,
      graph.bus,
      frequency,
      when,
      this.#sound,
      volume,
    );
    this.#voices.add(voice);
    void voice.ended.then(() => this.#voices.delete(voice));
    voice.release(when + Math.max(params.a, duration - params.r), params.r);
    return {
      ended: voice.ended,
      release: (at = ctx.currentTime) => voice.stop(at),
    };
  }

  /** Releases every held note with the release of the sound. */
  releaseAll(): void {
    for (const midi of [...this.#held.keys()]) this.noteOff(midi);
  }

  /** Stop-all (Esc, a module switch): every voice fades out fast. */
  stopAll(): void {
    const now = this.#graph?.ctx.currentTime ?? 0;
    for (const voice of this.#voices) voice.stop(now);
    this.#held.clear();
    this.#emitHeld();
  }

  #emitHeld(): void {
    this.#heldSnapshot = new Set(this.#held.keys());
    for (const listener of this.#listeners) listener();
  }

  #ensureGraph(): Graph | null {
    const output = this.deps.output();
    if (!output) return null;
    if (this.#graph?.ctx === output.ctx) return this.#graph;
    // A new context (first note, or audio retried after a failure): a new graph.
    for (const node of this.#graph?.nodes ?? []) node.disconnect();
    this.#held.clear();
    this.#voices.clear();
    this.#graph = buildGraph(output, this.#sound);
    for (const listener of this.#listeners) listener();
    return this.#graph;
  }
}

/** SR4: bus → filter → volume → dry and echo → compressor → analyser → output. */
function buildGraph(output: SynthOutput, sound: SynthSound): Graph {
  const { ctx, destination } = output;
  const { params } = sound;
  const bus = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = params.cut;
  filter.Q.value = params.res;
  const volume = ctx.createGain();
  volume.gain.value = volumeGain(params.vol);
  const delay = ctx.createDelay(MAX_DELAY_SECONDS);
  delay.delayTime.value = params.dt;
  const feedback = ctx.createGain();
  feedback.gain.value = params.fb;
  const wet = ctx.createGain();
  wet.gain.value = params.dm;
  // S009: a compressor set as a limiter keeps many notes from clipping. A
  // lower threshold also squeezes the envelope of one note (Chromium compresses
  // below the threshold too), so it acts near full scale only.
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -1;
  compressor.knee.value = 0;
  compressor.ratio.value = 20;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.1;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = SCOPE_FRAME;

  bus.connect(filter).connect(volume);
  volume.connect(compressor); // dry, always at full level (S007)
  volume.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(wet).connect(compressor);
  compressor.connect(analyser).connect(destination);

  return {
    ctx,
    bus,
    filter,
    volume,
    delay,
    feedback,
    wet,
    analyser,
    nodes: [bus, filter, volume, delay, feedback, wet, compressor, analyser],
  };
}
