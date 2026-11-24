import { audioEngine, R15 } from "@/audio";
import { useAppStore } from "@/state";
import {
  CHORD_MARK_RATIO,
  CHORD_SOUND_RATIO,
  QUEUE_START,
  generateChords,
  mulberry32,
  seedFromText,
  slotBeats,
  slotSeconds,
  smoothVoicing,
  takeFromQueue,
  voiceChord,
  type ChordRef,
  type EndlessContext,
  type GeneratedChord,
  type Note,
  type RandomSource,
} from "@/theory";
import { getEndlessSettings, selectEndless, setEndless } from "./settings";

export type GeneratorStatus = "idle" | "running" | "paused";

export interface HistoryEntry {
  readonly id: number;
  /** The chord with the inversion that sounded (smooth voicing). */
  readonly chord: ChordRef;
  readonly seventh: boolean;
  readonly notes: readonly Note[];
  /** Beats of its slot (1 or 2, R13), for the MIDI export. */
  readonly beats: number;
}

export interface GeneratorSnapshot {
  readonly status: GeneratorStatus;
  /** Every chord since the last start, oldest first (max HISTORY_LIMIT). */
  readonly history: readonly HistoryEntry[];
  /** The id of the chord that plays now; null when stopped (F166). */
  readonly currentId: number | null;
}

export const HISTORY_LIMIT = 512;
/** F160: the first chord plays 50 ms after start. */
const FIRST_CHORD_DELAY_MS = 50;

const IDLE: GeneratorSnapshot = {
  status: "idle",
  history: [],
  currentId: null,
};

/** Test seams. */
export interface GeneratorDeps {
  now(): number;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  play(notes: readonly Note[], duration: number, mark: number): void;
  cancelSound(): void;
  newSeed(): string;
}

function browserDeps(): GeneratorDeps {
  let cancel: (() => void) | null = null;
  let token = 0;
  return {
    now: () => performance.now(),
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (handle) =>
      clearTimeout(handle as ReturnType<typeof setTimeout>),
    play: (notes, duration, markSeconds) => {
      const mine = ++token;
      // The chord runs on the Tone.js Transport of the audio engine.
      void audioEngine
        .schedule([
          {
            at: 0,
            notes,
            kind: "chord",
            options: { duration, markSeconds, volume: R15.chord.volume },
          },
        ])
        .then((c) => {
          if (mine === token) cancel = c;
          else c();
        });
    },
    cancelSound: () => {
      token++;
      cancel?.();
      cancel = null;
    },
    newSeed: () => String(Math.floor(Math.random() * 1_000_000)),
  };
}

/**
 * The Endless generator (F159–F166). It lives outside React so it keeps its
 * state across renders; it registers its stop with the audio engine, so a
 * module switch and stop-all stop it (fixes U13).
 */
export class EndlessGenerator {
  #snapshot: GeneratorSnapshot = IDLE;
  #listeners = new Set<() => void>();
  #random: RandomSource = mulberry32(0);
  #queue: GeneratedChord[] = [];
  #timer: unknown = null;
  #nextAt = 0;
  #nextId = 1;
  #lastNotes: readonly Note[] | null = null;
  #deps: GeneratorDeps;

  constructor(deps?: GeneratorDeps) {
    this.#deps = deps ?? browserDeps();
  }

  getSnapshot = (): GeneratorSnapshot => this.#snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  /** F160: clears the list, pre-generates 16 chords, plays the first after 50 ms. Resumes when paused. */
  start(): void {
    if (this.#snapshot.status === "running") return;
    if (this.#snapshot.status === "paused") {
      this.#set({ status: "running" });
      this.#scheduleStep(0);
      return;
    }
    let { seed } = getEndlessSettings();
    if (!seed.trim()) {
      seed = this.#deps.newSeed();
      setEndless({ seed });
    }
    this.#random = mulberry32(seedFromText(seed));
    this.#queue = generateChords(this.#context(), this.#random, QUEUE_START);
    this.#lastNotes = null;
    this.#set({ status: "running", history: [], currentId: null });
    this.#scheduleStep(FIRST_CHORD_DELAY_MS);
  }

  /** F166: keeps the listed chords, with no current chord. */
  stop(): void {
    this.#clearTimer();
    this.#deps.cancelSound();
    if (this.#snapshot.status !== "idle" || this.#snapshot.currentId !== null)
      this.#set({ status: "idle", currentId: null });
  }

  toggle(): void {
    if (this.#snapshot.status === "running") this.stop();
    else this.start();
  }

  /** The page went to the background (iOS): pause, do not run hidden. */
  pause(): void {
    if (this.#snapshot.status !== "running") return;
    this.#clearTimer();
    this.#deps.cancelSound();
    this.#set({ status: "paused" });
  }

  /** F162: a new key, scale or style discards the queue and plays a new chord at once. */
  contextChanged(): void {
    if (this.#snapshot.status !== "running") {
      this.#queue = [];
      return;
    }
    this.#queue = [];
    this.#clearTimer();
    this.#step();
  }

  #context(): EndlessContext {
    const { key, scale, style } = getEndlessSettings();
    return { key, scale, style };
  }

  #scheduleStep(delayMs: number): void {
    this.#clearTimer();
    this.#nextAt = this.#deps.now() + delayMs;
    this.#timer = this.#deps.setTimer(() => this.#step(), delayMs);
  }

  #step(): void {
    this.#timer = null;
    const settings = getEndlessSettings();
    const context: EndlessContext = {
      key: settings.key,
      scale: settings.scale,
      style: settings.style,
    };
    const { chord: generated, queue } = takeFromQueue(
      this.#queue,
      context,
      this.#random,
    );
    this.#queue = queue;

    const octave = useAppStore.getState().global.octave;
    const voiced = settings.smooth
      ? smoothVoicing(this.#lastNotes, generated.chord, octave)
      : { inversion: 0, notes: voiceChord(generated.chord, octave) };
    this.#lastNotes = voiced.notes;

    // F158: the BPM of this moment sets this slot; a new BPM applies from the next chord.
    const slot = slotSeconds(settings.style, settings.bpm);
    this.#deps.play(
      voiced.notes,
      slot * CHORD_SOUND_RATIO,
      slot * CHORD_MARK_RATIO,
    );

    const entry: HistoryEntry = {
      id: this.#nextId++,
      chord: { ...generated.chord, inversion: voiced.inversion },
      seventh: generated.seventh,
      notes: voiced.notes,
      beats: slotBeats(settings.style),
    };
    const history = [...this.#snapshot.history, entry].slice(-HISTORY_LIMIT);
    this.#set({ history, currentId: entry.id });

    // Drift-free timing: each slot starts from the planned time of the last one.
    const now = this.#deps.now();
    const base = Math.max(this.#nextAt, now - 20);
    this.#nextAt = base + slot * 1000;
    this.#timer = this.#deps.setTimer(
      () => this.#step(),
      Math.max(0, this.#nextAt - now),
    );
  }

  #clearTimer(): void {
    if (this.#timer !== null) this.#deps.clearTimer(this.#timer);
    this.#timer = null;
  }

  #set(patch: Partial<GeneratorSnapshot>): void {
    this.#snapshot = { ...this.#snapshot, ...patch };
    for (const listener of this.#listeners) listener();
  }
}

/** The app's one generator. Creating it touches no browser API. */
export const endlessGenerator = new EndlessGenerator();

const wired = new WeakSet<EndlessGenerator>();

/**
 * Connects the generator to the app once (client only): stop-all, store
 * changes of key, scale and style (F162) and the page visibility.
 */
export function wireEndlessGenerator(
  generator: EndlessGenerator = endlessGenerator,
): void {
  if (wired.has(generator)) return;
  wired.add(generator);
  audioEngine.onStopAll(() => generator.stop());
  let previous = selectEndless(useAppStore.getState());
  useAppStore.subscribe((state) => {
    const next = selectEndless(state);
    if (next === previous) return;
    const changed =
      next.key !== previous.key ||
      next.scale !== previous.scale ||
      next.style !== previous.style;
    previous = next;
    if (changed) generator.contextChanged();
  });
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") generator.pause();
    });
  }
}
