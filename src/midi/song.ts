/**
 * A pure song model for Standard MIDI Files. Times are in ticks.
 * Tickets 3 and 6 map their data (progressions, roll notes) to a `Song`.
 */
export const TICKS_PER_QUARTER = 480;

export interface SongNote {
  /** MIDI note number, 0–127. */
  readonly midi: number;
  readonly startTick: number;
  readonly durationTicks: number;
  /** 1–127. */
  readonly velocity: number;
}

export interface Song {
  readonly tempoBpm: number;
  readonly timeSignature: readonly [numerator: number, denominator: number];
  readonly trackName: string;
  /** General MIDI program, 0 = Acoustic Grand Piano (R21). */
  readonly program: number;
  readonly notes: readonly SongNote[];
}

export function secondsToTicks(seconds: number, bpm: number): number {
  return Math.round(((seconds * bpm) / 60) * TICKS_PER_QUARTER);
}

export function ticksToSeconds(ticks: number, bpm: number): number {
  return (ticks / TICKS_PER_QUARTER) * (60 / bpm);
}

export function clampMidi(value: number): number {
  return Math.min(127, Math.max(0, Math.round(value)));
}

export function clampVelocity(value: number): number {
  return Math.min(127, Math.max(1, Math.round(value)));
}
