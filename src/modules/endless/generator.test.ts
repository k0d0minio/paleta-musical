import { beforeEach, describe, expect, it } from "vitest";
import { audioEngine } from "@/audio";
import { resetAllData, useAppStore } from "@/state";
import { getChordType, type Note } from "@/theory";
import { EndlessGenerator, wireEndlessGenerator } from "./generator";
import { historyToSong, sendToTimeline } from "./export";
import { setEndless } from "./settings";

/** A fake clock and timer queue: tests run the generator step by step. */
function fakeDeps() {
  let now = 0;
  let next = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const played: { notes: readonly Note[]; duration: number; mark: number }[] =
    [];
  let cancels = 0;
  const deps = {
    now: () => now,
    setTimer: (fn: () => void, ms: number) => {
      const id = next++;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimer: (id: unknown) => void timers.delete(id as number),
    play: (notes: readonly Note[], duration: number, mark: number) =>
      void played.push({ notes, duration, mark }),
    cancelSound: () => void cancels++,
    newSeed: () => "12345",
  };
  /** Advances the clock and runs due timers in order. */
  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      const due = [...timers.entries()]
        .filter(([, t]) => t.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      timers.delete(due[0]);
      now = due[1].at;
      due[1].fn();
    }
    now = end;
  };
  return {
    deps,
    advance,
    played,
    pending: () => timers.size,
    cancels: () => cancels,
  };
}

const names = (g: EndlessGenerator) =>
  g
    .getSnapshot()
    .history.map((e) => `${e.chord.root}${getChordType(e.chord.type).symbol}`);

beforeEach(async () => {
  await resetAllData();
});

describe("Endless generator", () => {
  it("plays the first chord after 50 ms, then one per slot (F160)", () => {
    const f = fakeDeps();
    const g = new EndlessGenerator(f.deps);
    setEndless({ style: "trap", bpm: 120, seed: "1" });
    g.start();
    expect(g.getSnapshot().status).toBe("running");
    f.advance(49);
    expect(f.played).toHaveLength(0);
    f.advance(1);
    expect(f.played).toHaveLength(1);
    // Trap: 1 beat at 120 BPM = 0.5 s; sound 82 %, mark 75 %.
    expect(f.played[0]?.duration).toBeCloseTo(0.41);
    expect(f.played[0]?.mark).toBeCloseTo(0.375);
    f.advance(500 * 10);
    expect(f.played).toHaveLength(11);
    expect(g.getSnapshot().currentId).toBe(g.getSnapshot().history.at(-1)?.id);
  });

  it("applies a new BPM from the next chord (F158)", () => {
    const f = fakeDeps();
    const g = new EndlessGenerator(f.deps);
    setEndless({ style: "jazz", bpm: 120, seed: "1" });
    g.start();
    f.advance(50); // chord 1, slot = 2 beats = 1 s
    setEndless({ bpm: 60 }); // next slots = 2 s
    f.advance(1000); // chord 2 at the old slot length
    expect(f.played).toHaveLength(2);
    f.advance(1999);
    expect(f.played).toHaveLength(2);
    f.advance(1);
    expect(f.played).toHaveLength(3);
  });

  it("repeats the same sequence for the same seed, key, scale and style", () => {
    const run = () => {
      const f = fakeDeps();
      const g = new EndlessGenerator(f.deps);
      setEndless({ style: "dark", bpm: 120, seed: "night", key: 4 });
      g.start();
      f.advance(50 + 500 * 40);
      g.stop();
      return names(g);
    };
    const a = run();
    expect(a.length).toBeGreaterThan(40);
    expect(run()).toEqual(a);
  });

  it("draws a seed when the field is empty and keeps it", () => {
    const f = fakeDeps();
    const g = new EndlessGenerator(f.deps);
    setEndless({ seed: "" });
    g.start();
    expect(useAppStore.getState().modules.endless.seed).toBe("12345");
  });

  it("plays a new chord at once when key, scale or style changes (F162)", () => {
    const f = fakeDeps();
    const g = new EndlessGenerator(f.deps);
    wireEndlessGenerator(g);
    setEndless({ style: "relaxing", bpm: 60, seed: "3", key: 0 });
    g.start();
    f.advance(50);
    expect(f.played).toHaveLength(1);
    setEndless({ key: 5 });
    expect(f.played).toHaveLength(2);
    // The new chord is in the new key: F major (Relaxante, Maior is not forced).
    setEndless({ scale: "major" });
    expect(f.played).toHaveLength(3);
    setEndless({ style: "trap", bpm: 140 });
    expect(f.played).toHaveLength(4);
    // Only one timer runs after the changes.
    expect(f.pending()).toBe(1);
    g.stop();
  });

  it("stops on stop-all and on a module switch (U13), keeping the list (F166)", () => {
    const f = fakeDeps();
    const g = new EndlessGenerator(f.deps);
    wireEndlessGenerator(g);
    setEndless({ style: "trap", bpm: 120, seed: "1" });
    g.start();
    f.advance(50 + 500 * 3);
    const count = g.getSnapshot().history.length;
    audioEngine.stopAll();
    expect(g.getSnapshot()).toMatchObject({ status: "idle", currentId: null });
    expect(g.getSnapshot().history).toHaveLength(count);
    expect(f.pending()).toBe(0);
    f.advance(5000);
    expect(g.getSnapshot().history).toHaveLength(count);
  });

  it("pauses (background page) and resumes without clearing the list", () => {
    const f = fakeDeps();
    const g = new EndlessGenerator(f.deps);
    setEndless({ style: "trap", bpm: 120, seed: "1" });
    g.start();
    f.advance(50 + 500 * 2);
    g.pause();
    expect(g.getSnapshot().status).toBe("paused");
    const count = g.getSnapshot().history.length;
    f.advance(5000);
    expect(g.getSnapshot().history).toHaveLength(count);
    g.start();
    f.advance(0);
    expect(g.getSnapshot().history).toHaveLength(count + 1);
    g.stop();
  });

  it("restarts with an empty list after a stop (F160)", () => {
    const f = fakeDeps();
    const g = new EndlessGenerator(f.deps);
    setEndless({ seed: "1" });
    g.start();
    f.advance(50 + 500 * 3);
    g.stop();
    g.start();
    expect(g.getSnapshot().history).toHaveLength(0);
  });

  it("sends chords to the timeline with the tension mark and exports MIDI", () => {
    const f = fakeDeps();
    const g = new EndlessGenerator(f.deps);
    setEndless({ style: "dark", bpm: 120, seed: "7" });
    g.start();
    f.advance(50 + 500 * 15);
    g.stop();
    const history = g.getSnapshot().history;
    sendToTimeline(history.slice(-8));
    const items = useAppStore.getState().timeline.items;
    expect(items).toHaveLength(8);
    expect(items.map((i) => i.tension)).toEqual(
      history.slice(-8).map((e) => e.seventh),
    );
    const song = historyToSong(history, 120);
    expect(song.tempoBpm).toBe(120);
    expect(song.notes.length).toBe(
      history.reduce((n, e) => n + e.notes.length, 0),
    );
    // Dark: 1 beat per chord = 480 ticks.
    expect(song.notes.at(-1)?.startTick).toBe((history.length - 1) * 480);
  });
});
