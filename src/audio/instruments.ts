import { R15, type VoiceShape } from "./r15";
import { scheduleVoice, type Voice } from "./voice";

/**
 * The instrument registry. An instrument turns one note request into a voice.
 * Sampled instruments (piano, mallets) join this list when their samples are
 * self-hosted (see the follow-up issue in the PR).
 */
export interface Instrument {
  readonly id: InstrumentId;
  play(
    ctx: BaseAudioContext,
    destination: AudioNode,
    frequency: number,
    when: number,
    shape: VoiceShape,
  ): Voice;
}

export const INSTRUMENT_IDS = ["triangle", "synth"] as const;
export type InstrumentId = (typeof INSTRUMENT_IDS)[number];

type PlayFn = Instrument["play"];

const playTriangle: PlayFn = (ctx, destination, frequency, when, shape) =>
  scheduleVoice(ctx, destination, frequency, when, shape, R15.oscillator);

/** The Sintetizador sound (JAM-557). The synth installs its player; until then, the triangle plays. */
let synthPlayer: PlayFn | null = null;

export function setSynthPlayer(play: PlayFn): void {
  synthPlayer = play;
}

export const INSTRUMENTS: Record<InstrumentId, Instrument> = {
  triangle: { id: "triangle", play: playTriangle },
  synth: {
    id: "synth",
    play: (...args) => (synthPlayer ?? playTriangle)(...args),
  },
};

export function isInstrumentId(value: unknown): value is InstrumentId {
  return (
    typeof value === "string" &&
    (INSTRUMENT_IDS as readonly string[]).includes(value)
  );
}
