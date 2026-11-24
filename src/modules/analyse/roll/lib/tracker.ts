import { PITCH_COUNT, PITCH_MIN, clampVelocity, type RawNote } from "./model";

/** A note that sounds now (live view). */
export interface ActiveNote {
  readonly midi: number;
  readonly start: number;
  readonly velocity: number;
}

export interface PolyTrackerOptions {
  /** A note starts when its value goes above this. */
  readonly on: number;
  /** A sounding note ends when its value goes below this. */
  readonly off: number;
  /** A note needs this many frames above `off` (R19: 3). */
  readonly minFrames: number;
  /** A new note of the same pitch needs this gap after the last one ends (R20: 0.05 s). */
  readonly minGap: number;
}

interface Open {
  start: number;
  peak: number;
  frames: number;
}

/**
 * Polyphonic note on/off from per-pitch values with hysteresis. R19 (file)
 * and R20 (microphone, fixes U20) both use it, so every note has a real start
 * and a real end: its length is the time the pitch sounds.
 */
export class PolyTracker {
  readonly notes: RawNote[] = [];
  #open = new Map<number, Open>();
  #lastEnd = new Float64Array(PITCH_COUNT).fill(-Infinity);

  constructor(private readonly options: PolyTrackerOptions) {}

  update(t: number, values: ArrayLike<number>): void {
    for (let p = 0; p < PITCH_COUNT; p++) {
      const v = values[p] ?? 0;
      const open = this.#open.get(p);
      if (open) {
        if (v < this.options.off) this.#close(p, t);
        else {
          open.frames += 1;
          open.peak = Math.max(open.peak, v);
        }
      } else if (
        v > this.options.on &&
        t - (this.#lastEnd[p] ?? -Infinity) > this.options.minGap
      ) {
        this.#open.set(p, { start: t, peak: v, frames: 1 });
      }
    }
  }

  /** Ends every sounding note at time t. */
  finish(t: number): void {
    for (const p of [...this.#open.keys()]) this.#close(p, t);
  }

  active(): ActiveNote[] {
    return [...this.#open.entries()].map(([p, o]) => ({
      midi: PITCH_MIN + p,
      start: o.start,
      velocity: clampVelocity(127 * o.peak),
    }));
  }

  #close(p: number, t: number): void {
    const open = this.#open.get(p);
    if (!open) return;
    this.#open.delete(p);
    this.#lastEnd[p] = t;
    if (open.frames < this.options.minFrames || t <= open.start) return;
    this.notes.push({
      midi: PITCH_MIN + p,
      start: open.start,
      duration: t - open.start,
      velocity: clampVelocity(127 * open.peak),
    });
  }
}

export interface MonoTrackerOptions {
  /** Frames a new pitch (or silence) must hold before it counts. */
  readonly confirmFrames: number;
  /** Shortest note kept, in seconds. */
  readonly minSeconds: number;
}

/**
 * Monophonic note on/off from a pitch track (pitchy). A pitch change or a
 * silence that holds for `confirmFrames` frames ends the note at the frame
 * where the change began (U20: real lengths).
 */
export class MonoTracker {
  readonly notes: RawNote[] = [];
  #current: { midi: number; start: number; peak: number } | null = null;
  #pending: { midi: number | null; since: number; count: number } | null = null;

  constructor(private readonly options: MonoTrackerOptions) {}

  /** midi = null for silence or an unclear pitch; level 0–1. */
  update(t: number, midi: number | null, level: number): void {
    const current = this.#current;
    if (current && midi === current.midi) {
      current.peak = Math.max(current.peak, level);
      this.#pending = null;
      return;
    }
    if (!current && midi === null) {
      this.#pending = null;
      return;
    }
    if (this.#pending && this.#pending.midi === midi) this.#pending.count += 1;
    else this.#pending = { midi, since: t, count: 1 };
    if (this.#pending.count < this.options.confirmFrames) return;
    const since = this.#pending.since;
    this.#closeAt(since);
    if (midi !== null) this.#current = { midi, start: since, peak: level };
    this.#pending = null;
  }

  finish(t: number): void {
    this.#closeAt(t);
    this.#pending = null;
  }

  active(): ActiveNote[] {
    const c = this.#current;
    return c
      ? [
          {
            midi: c.midi,
            start: c.start,
            velocity: clampVelocity(127 * c.peak),
          },
        ]
      : [];
  }

  #closeAt(t: number): void {
    const c = this.#current;
    this.#current = null;
    if (!c || t - c.start < this.options.minSeconds) return;
    this.notes.push({
      midi: c.midi,
      start: c.start,
      duration: t - c.start,
      velocity: clampVelocity(127 * c.peak),
    });
  }
}
