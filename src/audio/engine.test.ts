import { AudioContext as AudioContextMock } from "standardized-audio-context-mock";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioEngine } from "./engine";
import { clearSounding, isSounding } from "./sounding";

function makeEngine() {
  const ctx = new AudioContextMock();
  const resume = vi.spyOn(ctx, "resume");
  const engine = new AudioEngine({ createContext: () => ctx as unknown as AudioContext });
  return { ctx, engine, resume };
}

afterEach(() => {
  clearSounding();
  vi.useRealTimers();
});

describe("AudioEngine", () => {
  it("starts locked and runs after the unlock gesture (F002)", async () => {
    const { engine } = makeEngine();
    expect(engine.getStatus().state).toBe("locked");
    engine.unlock();
    await Promise.resolve();
    await Promise.resolve();
    expect(engine.getStatus().state).toBe("running");
  });

  it("resumes a suspended context before each sound (F004)", () => {
    const { ctx, engine, resume } = makeEngine();
    engine.playNote({ pc: 0, octave: 4 });
    expect(resume).toHaveBeenCalledTimes(1);
    void ctx.suspend();
    engine.playChord([
      { pc: 0, octave: 4 },
      { pc: 4, octave: 4 },
    ]);
    expect(resume).toHaveBeenCalledTimes(2);
  });

  it("marks a played note as sounding for its time (F011)", () => {
    vi.useFakeTimers();
    const { engine } = makeEngine();
    engine.playNote({ pc: 7, octave: 4 }, { markSeconds: 0.7 });
    expect(isSounding(7)).toBe(true);
    vi.advanceTimersByTime(699);
    expect(isSounding(7)).toBe(true);
    vi.advanceTimersByTime(2);
    expect(isSounding(7)).toBe(false);
  });

  it("stop-all runs every registered stop handler and clears the marks", () => {
    const { engine } = makeEngine();
    const generatorStop = vi.fn();
    engine.onStopAll(generatorStop);
    engine.playNote({ pc: 2, octave: 4 });
    engine.stopAll();
    expect(generatorStop).toHaveBeenCalledOnce();
    expect(isSounding(2)).toBe(false);
    expect(engine.getStatus().playing).toBe(false);
  });

  it("reports unavailable when the browser has no Web Audio", () => {
    const engine = new AudioEngine();
    const original = globalThis.AudioContext;
    // jsdom has no AudioContext.
    expect(typeof original).toBe("undefined");
    engine.unlock();
    expect(engine.getStatus().state).toBe("unavailable");
  });
});
