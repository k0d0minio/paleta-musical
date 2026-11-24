import { configureAudioSession } from "@/platform/capabilities";
import { frequency, type Note } from "@/theory";
import { INSTRUMENTS, type InstrumentId } from "./instruments";
import { NOTE_MARK_SECONDS, R15, type VoiceShape } from "./r15";
import { clearSounding, markSounding } from "./sounding";
import type { Voice } from "./voice";
import type * as Tone from "tone";

export type AudioState =
  "locked" | "running" | "suspended" | "unavailable" | "error";

export interface AudioStatus {
  readonly state: AudioState;
  /** True while a voice sounds or a pattern is scheduled. */
  readonly playing: boolean;
}

export interface PlayOptions extends Partial<VoiceShape> {
  /** How long the notes are marked as sounding, in seconds. */
  readonly markSeconds?: number;
}

export interface PatternEvent {
  /** Seconds from the start of the pattern. */
  readonly at: number;
  readonly notes: readonly Note[];
  readonly kind?: "note" | "chord";
  readonly options?: PlayOptions;
  /** Runs on the main thread when the event sounds (e.g. to mark the playing chord). */
  readonly onStart?: () => void;
}

export interface ScheduleOptions {
  /** Runs once when the pattern ends, is cancelled, is replaced or stopAll runs. */
  readonly onEnd?: () => void;
}

export interface EngineOptions {
  /** Test seam: creates the AudioContext. */
  readonly createContext?: () => AudioContext;
}

type ToneModule = typeof Tone;

/**
 * The one audio engine (a singleton service). It owns the one AudioContext,
 * a master gain with a limiter and every voice. Tone.js loads on demand for
 * Transport scheduling only; plain notes need no library.
 */
export class AudioEngine {
  #ctx: AudioContext | null = null;
  #master: GainNode | null = null;
  #voices = new Set<Voice>();
  #status: AudioStatus = { state: "locked", playing: false };
  #listeners = new Set<() => void>();
  #stopHandlers = new Set<() => void>();
  #volume = 0.8;
  #instrument: InstrumentId = "triangle";
  #tone: Promise<ToneModule> | null = null;
  #cancelPattern: (() => void) | null = null;
  #gestureSeen = false;

  constructor(private readonly options: EngineOptions = {}) {}

  getStatus = (): AudioStatus => this.#status;

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  get context(): AudioContext | null {
    return this.#ctx;
  }

  /**
   * Unlocks audio (F001–F003). Call it inside a pointer or key gesture: it
   * creates or resumes the context and plays a 1-sample silent buffer (iOS).
   */
  unlock(): void {
    this.#gestureSeen = true;
    const ctx = this.#ensureContext();
    if (!ctx) return;
    configureAudioSession();
    if (ctx.state !== "running") {
      try {
        const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch {
        // Not needed outside iOS.
      }
      ctx.resume().then(
        () => this.#syncState(),
        () => this.#setStatus({ state: "error" }),
      );
    }
    this.#syncState();
  }

  /** Retry after an audio failure: a fresh context on the next unlock. */
  retry(): void {
    if (this.#ctx?.state === "closed" || this.#status.state === "error") {
      this.#ctx = null;
      this.#master = null;
      this.#tone = null;
      this.#setStatus({ state: "locked" });
    }
    this.unlock();
  }

  setVolume(volume: number): void {
    this.#volume = Math.min(1, Math.max(0, volume));
    if (this.#ctx && this.#master) {
      this.#master.gain.setTargetAtTime(
        this.#volume,
        this.#ctx.currentTime,
        0.02,
      );
    }
  }

  setInstrument(id: InstrumentId): void {
    this.#instrument = id;
  }

  /**
   * The master input (master gain, limiter, speakers) for a module that builds
   * its own graph (the synth). Call it inside a gesture: it creates or resumes
   * the context. Null without audio.
   */
  moduleOutput(): { ctx: AudioContext; destination: AudioNode } | null {
    const ctx = this.#ensureContext();
    if (!ctx || !this.#master) return null;
    this.#resume();
    return { ctx, destination: this.#master };
  }

  /** Plays one note (F007, R15 note values). */
  playNote(note: Note, options: PlayOptions = {}): void {
    markSounding([note.pc], options.markSeconds ?? NOTE_MARK_SECONDS);
    this.#play([note], { ...R15.note, ...options });
  }

  /** Plays all notes of a chord at once (F008, R15 chord values). */
  playChord(notes: readonly Note[], options: PlayOptions = {}): void {
    markSounding(
      notes.map((n) => n.pc),
      options.markSeconds ?? R15.chord.duration,
    );
    this.#play(notes, { ...R15.chord, ...options });
  }

  /**
   * Schedules a pattern on the Tone.js Transport, sample-accurate. A new
   * pattern replaces the one that plays. Returns a function that cancels it.
   */
  async schedule(
    events: readonly PatternEvent[],
    scheduleOptions: ScheduleOptions = {},
  ): Promise<() => void> {
    const ctx = this.#ensureContext();
    if (!ctx || events.length === 0) {
      scheduleOptions.onEnd?.();
      return () => {};
    }
    this.#cancelPattern?.();
    const Tone = await this.#loadTone(ctx);
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.position = 0;

    const uiTimers = new Set<ReturnType<typeof setTimeout>>();
    let end = 0;
    for (const event of events) {
      const kind = event.kind ?? (event.notes.length > 1 ? "chord" : "note");
      const shape = {
        ...(kind === "chord" ? R15.chord : R15.note),
        ...event.options,
      };
      end = Math.max(end, event.at + shape.duration);
      transport.scheduleOnce((time) => {
        this.#play(event.notes, shape, time);
        // A main-thread timer on the audio clock (Tone's Draw uses
        // requestAnimationFrame and drops late callbacks in a throttled page).
        const delay = Math.max(0, (time - ctx.currentTime) * 1000);
        const timer = setTimeout(() => {
          uiTimers.delete(timer);
          markSounding(
            event.notes.map((n) => n.pc),
            event.options?.markSeconds ?? shape.duration,
          );
          event.onStart?.();
        }, delay);
        uiTimers.add(timer);
      }, event.at);
    }
    transport.scheduleOnce((time) => {
      const timer = setTimeout(
        () => cancel(),
        Math.max(0, (time - ctx.currentTime) * 1000),
      );
      uiTimers.add(timer);
    }, end);

    let ended = false;
    const cancel = () => {
      for (const timer of uiTimers) clearTimeout(timer);
      uiTimers.clear();
      if (this.#cancelPattern === cancel) {
        transport.stop();
        transport.cancel();
        this.#cancelPattern = null;
      }
      this.#updatePlaying();
      if (!ended) {
        ended = true;
        scheduleOptions.onEnd?.();
      }
    };
    this.#cancelPattern = cancel;
    this.#resume();
    transport.start();
    this.#updatePlaying();
    return cancel;
  }

  /** Stops every sound, every pattern and every registered generator (F017, U13). */
  stopAll(): void {
    this.#cancelPattern?.();
    const now = this.#ctx?.currentTime;
    for (const voice of this.#voices) voice.release(now);
    this.#voices.clear();
    for (const handler of this.#stopHandlers) {
      try {
        handler();
      } catch {
        // One failing handler must not keep others playing.
      }
    }
    clearSounding();
    this.#updatePlaying();
  }

  /** A module that plays on its own (a generator) registers its stop here. */
  onStopAll(handler: () => void): () => void {
    this.#stopHandlers.add(handler);
    return () => this.#stopHandlers.delete(handler);
  }

  #play(notes: readonly Note[], shape: VoiceShape, when?: number): void {
    const ctx = this.#ensureContext();
    const master = this.#master;
    if (!ctx || !master) return;
    this.#resume();
    const start = when ?? ctx.currentTime + 0.005;
    const instrument = INSTRUMENTS[this.#instrument];
    for (const note of notes) {
      try {
        const voice = instrument.play(
          ctx,
          master,
          frequency(note),
          start,
          shape,
        );
        this.#voices.add(voice);
        void voice.ended.then(() => {
          this.#voices.delete(voice);
          this.#updatePlaying();
        });
      } catch {
        this.#setStatus({ state: "error" });
      }
    }
    this.#updatePlaying();
  }

  /** F004: resume a suspended context before each sound; the sound is still attempted. */
  #resume(): void {
    const ctx = this.#ctx;
    if (ctx && ctx.state !== "running" && ctx.state !== "closed") {
      ctx.resume().then(
        () => this.#syncState(),
        () => undefined,
      );
    }
  }

  #ensureContext(): AudioContext | null {
    if (this.#ctx) return this.#ctx;
    if (this.#status.state === "unavailable") return null;
    try {
      const create =
        this.options.createContext ??
        (typeof AudioContext === "function"
          ? () => new AudioContext({ latencyHint: "interactive" })
          : null);
      if (!create) {
        this.#setStatus({ state: "unavailable" });
        return null;
      }
      const ctx = create();
      const master = ctx.createGain();
      master.gain.value = this.#volume;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.1;
      master.connect(limiter);
      limiter.connect(ctx.destination);
      ctx.onstatechange = () => this.#syncState();
      this.#ctx = ctx;
      this.#master = master;
      this.#syncState();
      return ctx;
    } catch {
      this.#setStatus({ state: "error" });
      return null;
    }
  }

  async #loadTone(ctx: AudioContext): Promise<ToneModule> {
    this.#tone ??= import("tone").then((Tone) => {
      Tone.setContext(ctx);
      return Tone;
    });
    return this.#tone;
  }

  #syncState(): void {
    const state = this.#ctx?.state;
    if (state === "running") this.#setStatus({ state: "running" });
    else if (state === "closed") this.#setStatus({ state: "error" });
    else if (this.#status.state !== "error") {
      this.#setStatus({ state: this.#gestureSeen ? "suspended" : "locked" });
    }
  }

  #updatePlaying(): void {
    this.#setStatus({
      playing: this.#voices.size > 0 || this.#cancelPattern !== null,
    });
  }

  #setStatus(patch: Partial<AudioStatus>): void {
    const next = { ...this.#status, ...patch };
    if (
      next.state === this.#status.state &&
      next.playing === this.#status.playing
    )
      return;
    this.#status = next;
    for (const listener of this.#listeners) listener();
  }
}

/** The app-wide engine. Creating it touches no browser API. */
export const audioEngine = new AudioEngine();
