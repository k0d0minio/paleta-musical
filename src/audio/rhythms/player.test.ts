import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { audioEngine, type PatternEvent, type ScheduleOptions } from "@/audio";
import type { Note } from "@/theory";
import {
  getRhythmPlayerState,
  installRhythmPlayer,
  playRhythm,
  stopRhythm,
  toPatternEvents,
} from "./player";

const C: Note[] = [
  { pc: 0, octave: 4 },
  { pc: 4, octave: 4 },
  { pc: 7, octave: 4 },
];
const options = {
  bpm: 120,
  swing: 0.67,
  strumMs: 40,
  repeats: 1,
  arpNoteMs: null,
};

interface Call {
  events: readonly PatternEvent[];
  opts: ScheduleOptions;
  cancel: ReturnType<typeof vi.fn>;
}
let calls: Call[] = [];

beforeEach(() => {
  calls = [];
  vi.spyOn(audioEngine, "schedule").mockImplementation(
    async (events, opts = {}) => {
      // Like the engine: a new pattern ends the old one.
      const previous = calls.at(-1);
      previous?.opts.onEnd?.();
      const cancel = vi.fn(() => opts.onEnd?.());
      calls.push({ events, opts, cancel });
      return cancel;
    },
  );
});
afterEach(() => {
  stopRhythm();
  vi.restoreAllMocks();
});

describe("rhythm player", () => {
  it("maps beats to seconds with the R9 volumes and marks", () => {
    const [e] = toPatternEvents(
      [
        {
          beat: 2,
          durationBeats: 0.85,
          notes: C,
          volume: 0.18,
          velocity: 90,
          markBeats: 0.75,
          chordIndex: 0,
          first: true,
        },
      ],
      120,
    );
    expect(e).toMatchObject({
      at: 1,
      kind: "chord",
      options: { duration: 0.425, volume: 0.18, markSeconds: 0.375 },
    });
  });

  it("U02/U03: the list that plays knows it and the cue marks the chord that sounds", async () => {
    await playRhythm({
      source: "timeline",
      rhythm: "simples",
      chords: [C, C],
      options,
    });
    expect(getRhythmPlayerState().source).toBe("timeline");
    calls[0]?.events[1]?.onStart?.();
    expect(getRhythmPlayerState().chordIndex).toBe(1);
    stopRhythm("timeline");
    expect(getRhythmPlayerState().source).toBeNull();
    expect(calls[0]?.cancel).toHaveBeenCalled();
  });

  it("U39: a new playback replaces the old one (one Transport)", async () => {
    await playRhythm({
      source: "style:pop1",
      rhythm: "simples",
      chords: [C],
      options,
    });
    await playRhythm({
      source: "builder",
      rhythm: "simples",
      chords: [C],
      options,
    });
    expect(getRhythmPlayerState().source).toBe("builder");
    // The old pattern's end does not reset the new playback.
    calls[0]?.opts.onEnd?.();
    expect(getRhythmPlayerState().source).toBe("builder");
  });

  it("U31: the playing state ends when the pattern ends", async () => {
    await playRhythm({
      source: "builder",
      rhythm: "simples",
      chords: [C],
      options,
    });
    calls[0]?.opts.onEnd?.();
    expect(getRhythmPlayerState().source).toBeNull();
  });

  it("stopping another source does nothing; an empty list does not play (F093)", async () => {
    await playRhythm({
      source: "builder",
      rhythm: "simples",
      chords: [],
      options,
    });
    expect(calls).toHaveLength(0);
    await playRhythm({
      source: "builder",
      rhythm: "simples",
      chords: [C],
      options,
    });
    stopRhythm("timeline");
    expect(getRhythmPlayerState().source).toBe("builder");
  });

  it("loops until stopped, and stop-all ends the loop", async () => {
    vi.useFakeTimers();
    installRhythmPlayer();
    await playRhythm({
      source: "timeline",
      rhythm: "simples",
      chords: [C],
      options,
      loop: true,
    });
    calls[0]?.opts.onEnd?.();
    await vi.runAllTimersAsync();
    expect(calls).toHaveLength(2);
    audioEngine.stopAll();
    await vi.runAllTimersAsync();
    expect(calls).toHaveLength(2);
    expect(getRhythmPlayerState().source).toBeNull();
    vi.useRealTimers();
  });

  it("stops and shows a paused state when the page goes to the background", async () => {
    installRhythmPlayer();
    await playRhythm({
      source: "timeline",
      rhythm: "simples",
      chords: [C],
      options,
    });
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(getRhythmPlayerState()).toMatchObject({
      source: null,
      paused: true,
    });
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
  });
});
