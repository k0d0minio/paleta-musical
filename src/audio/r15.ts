/** R15 synth constants: the sound of the original app, kept as the "triangle" instrument. */
export const R15 = {
  oscillator: "triangle" as OscillatorType,
  note: { duration: 1.4, volume: 0.32, attack: 0.01 },
  chord: { duration: 1.8, volume: 0.18, attack: 0.015 },
  /** Exponential decay ends at this gain (F007). */
  floor: 0.001,
} as const;

/** F031: a palette note is marked as sounding for 0.7 s. */
export const NOTE_MARK_SECONDS = 0.7;
/** F023: the last-chord replay is marked as sounding for 1.5 s. */
export const LAST_CHORD_MARK_SECONDS = 1.5;

export interface VoiceShape {
  readonly duration: number;
  readonly volume: number;
  readonly attack: number;
}
