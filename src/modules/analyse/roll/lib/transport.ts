/**
 * The roll transport (pure; the clock is a parameter). U18: stop keeps the
 * playhead, play starts from the playhead, home goes to 0. A loop region
 * repeats once playback reaches its end.
 */
export interface Loop {
  readonly start: number;
  readonly end: number;
}

export interface TransportState {
  readonly playing: boolean;
  /** Where play starts (and where stop left the playhead). */
  readonly playhead: number;
  /** Clock time when play started. */
  readonly startedAt: number;
}

export const STOPPED: TransportState = {
  playing: false,
  playhead: 0,
  startedAt: 0,
};

export function isValidLoop(loop: Loop | null): loop is Loop {
  return loop !== null && loop.end - loop.start >= 0.05 && loop.start >= 0;
}

/** Time from the start of playback, mapped into the loop when it applies. */
function mapLoop(from: number, elapsed: number, loop: Loop | null): number {
  const raw = from + elapsed;
  if (!isValidLoop(loop) || from >= loop.end || raw < loop.end) return raw;
  const length = loop.end - loop.start;
  return loop.start + ((raw - loop.end) % length);
}

/** Number of times playback has jumped back to the loop start. */
export function loopPass(
  state: TransportState,
  now: number,
  loop: Loop | null,
): number {
  if (!state.playing || !isValidLoop(loop) || state.playhead >= loop.end)
    return 0;
  const raw = state.playhead + (now - state.startedAt);
  if (raw < loop.end) return 0;
  return 1 + Math.floor((raw - loop.end) / (loop.end - loop.start));
}

export function position(
  state: TransportState,
  now: number,
  loop: Loop | null = null,
): number {
  if (!state.playing) return state.playhead;
  return mapLoop(state.playhead, Math.max(0, now - state.startedAt), loop);
}

export function play(state: TransportState, now: number): TransportState {
  if (state.playing) return state;
  return { playing: true, playhead: state.playhead, startedAt: now };
}

/** U18: stop keeps the current position as the playhead. */
export function stop(
  state: TransportState,
  now: number,
  loop: Loop | null = null,
): TransportState {
  if (!state.playing) return state;
  return { playing: false, playhead: position(state, now, loop), startedAt: 0 };
}

/** Moves the playhead (and restarts from there when playing). */
export function seek(
  state: TransportState,
  t: number,
  now: number,
): TransportState {
  const playhead = Math.max(0, t);
  return state.playing
    ? { playing: true, playhead, startedAt: now }
    : { ...state, playhead };
}

/** U18: home goes to 0. */
export function home(state: TransportState, now: number): TransportState {
  return seek(state, 0, now);
}

/** F234: the natural end; the playhead goes back to 0 for the next play. */
export function ended(): TransportState {
  return STOPPED;
}
