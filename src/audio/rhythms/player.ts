import { useSyncExternalStore } from "react";
import {
  beatsToSeconds,
  renderRhythm,
  type Note,
  type RhythmEvent,
  type RhythmId,
  type RhythmOptions,
} from "@/theory";
import { audioEngine, type PatternEvent } from "../engine";

/**
 * The rhythm engine (F093–F096, R9). One player for every progression
 * playback: Estilos, the builder line and the timeline. It plays on the one
 * Transport of the audio engine, so a new playback stops the old one first
 * (U39). Each playback has a `source` id, so every list knows whether it plays
 * and which chord sounds (fixes U02, U03).
 */
export interface RhythmPlayerState {
  /** The source that plays, e.g. "timeline", "builder", "style:pop1". */
  readonly source: string | null;
  /** Index of the chord that sounds, in the source's list. */
  readonly chordIndex: number | null;
  /** True when playback stopped because the page went to the background. */
  readonly paused: boolean;
}

const IDLE: RhythmPlayerState = {
  source: null,
  chordIndex: null,
  paused: false,
};
let state: RhythmPlayerState = IDLE;
const listeners = new Set<() => void>();
let token = 0;
let cancelCurrent: (() => void) | null = null;

function setState(patch: Partial<RhythmPlayerState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export function getRhythmPlayerState(): RhythmPlayerState {
  return state;
}

export function subscribeRhythmPlayer(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Maps rhythm events (beats) to engine events (seconds). */
export function toPatternEvents(
  events: readonly RhythmEvent[],
  bpm: number,
  onChord?: (chordIndex: number) => void,
): PatternEvent[] {
  return events.map((e) => ({
    at: beatsToSeconds(e.beat, bpm),
    notes: e.notes,
    kind: e.notes.length > 1 ? "chord" : "note",
    options: {
      duration: beatsToSeconds(e.durationBeats, bpm),
      volume: e.volume,
      attack: e.notes.length > 1 ? 0.015 : 0.01,
      markSeconds: beatsToSeconds(e.markBeats, bpm),
    },
    onStart: e.first && onChord ? () => onChord(e.chordIndex) : undefined,
  }));
}

export interface PlayRhythmRequest {
  readonly source: string;
  readonly rhythm: RhythmId;
  /** Voiced chords (real notes). */
  readonly chords: readonly (readonly Note[])[];
  readonly options: RhythmOptions;
  /** Repeat until stopped (timeline loop). */
  readonly loop?: boolean;
}

/** Starts a playback; an empty list does nothing (F093). */
export async function playRhythm(request: PlayRhythmRequest): Promise<void> {
  const { events } = renderRhythm(
    request.rhythm,
    request.chords,
    request.options,
  );
  if (events.length === 0) return;
  token += 1;
  const mine = token;
  cancelCurrent = null;
  setState({ source: request.source, chordIndex: null, paused: false });
  const cancel = await audioEngine.schedule(
    toPatternEvents(events, request.options.bpm, (chordIndex) => {
      if (token === mine) setState({ chordIndex });
    }),
    {
      onEnd: () => {
        if (token !== mine) return;
        if (request.loop) {
          // stopAll runs its handlers after the pattern ends: wait for them.
          setTimeout(() => {
            if (token === mine) void playRhythm(request);
          }, 0);
          return;
        }
        cancelCurrent = null;
        setState({ source: null, chordIndex: null });
      },
    },
  );
  if (token === mine) cancelCurrent = cancel;
  else cancel();
}

/** Stops the playback (of `source` only, when given). Notes already started ring out (F094). */
export function stopRhythm(source?: string): void {
  if (source !== undefined && state.source !== source) return;
  token += 1;
  const cancel = cancelCurrent;
  cancelCurrent = null;
  setState({ source: null, chordIndex: null });
  cancel?.();
}

let installed = false;
/** Stop-all and the background page stop the rhythm player (iOS: shows a paused state). */
export function installRhythmPlayer(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  audioEngine.onStopAll(() => stopRhythm());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && state.source !== null) {
      stopRhythm();
      setState({ paused: true });
    }
  });
}

export function clearRhythmPaused(): void {
  if (state.paused) setState({ paused: false });
}

export function useRhythmPlayer(): RhythmPlayerState {
  return useSyncExternalStore(
    subscribeRhythmPlayer,
    getRhythmPlayerState,
    () => IDLE,
  );
}
