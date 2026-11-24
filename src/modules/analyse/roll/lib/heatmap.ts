import { PITCH_COUNT } from "./model";

/**
 * Heatmap frames (F248): for each analysis frame, its real start time and the
 * energy 0–1 of each pitch 36–96. U20: every frame has its own time, so a live
 * capture at ~60 frames/s and a file analysis at 1/0.046 s map correctly.
 */
export interface Heatmap {
  readonly count: number;
  /** Frame start times in seconds, ascending (length ≥ count). */
  readonly times: Float64Array;
  /** count × PITCH_COUNT values, row-major by frame; index 0 = MIDI 36. */
  readonly values: Float32Array;
  /** Length of the last frame, in seconds. */
  readonly frameSeconds: number;
}

/** A growable heatmap for live capture. */
export class HeatmapBuffer implements Heatmap {
  count = 0;
  times: Float64Array;
  values: Float32Array;
  frameSeconds: number;

  constructor(capacity = 1024, frameSeconds = 1 / 60) {
    this.times = new Float64Array(capacity);
    this.values = new Float32Array(capacity * PITCH_COUNT);
    this.frameSeconds = frameSeconds;
  }

  push(t: number, frame: ArrayLike<number>): void {
    if (this.count === this.times.length) this.#grow();
    this.times[this.count] = t;
    const offset = this.count * PITCH_COUNT;
    for (let p = 0; p < PITCH_COUNT; p++) {
      this.values[offset + p] = frame[p] ?? 0;
    }
    if (this.count > 0) {
      const last = this.times[this.count - 1] ?? t;
      if (t > last) this.frameSeconds = t - last;
    }
    this.count += 1;
  }

  reset(): void {
    this.count = 0;
  }

  #grow(): void {
    const times = new Float64Array(this.times.length * 2);
    times.set(this.times);
    const values = new Float32Array(this.values.length * 2);
    values.set(this.values);
    this.times = times;
    this.values = values;
  }
}

/** The end time of frame i (the next frame start, or start + frameSeconds). */
export function frameEnd(map: Heatmap, i: number): number {
  const next = i + 1 < map.count ? map.times[i + 1] : undefined;
  return next ?? (map.times[i] ?? 0) + map.frameSeconds;
}

/** Index of the first frame that ends after t (binary search). */
export function firstFrameAfter(map: Heatmap, t: number): number {
  let lo = 0;
  let hi = map.count;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (frameEnd(map, mid) <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
