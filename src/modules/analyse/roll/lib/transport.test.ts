import { describe, expect, it } from "vitest";
import {
  STOPPED,
  home,
  loopPass,
  play,
  position,
  seek,
  stop,
} from "./transport";

describe("U18: the playhead stays where stop left it", () => {
  it("stop keeps the playhead and play starts from it", () => {
    let s = play(STOPPED, 100);
    expect(position(s, 103.2)).toBeCloseTo(3.2, 9);
    s = stop(s, 103.2);
    expect(s.playing).toBe(false);
    expect(s.playhead).toBeCloseTo(3.2, 9);
    s = play(s, 200);
    expect(position(s, 200)).toBeCloseTo(3.2, 9);
    expect(position(s, 201)).toBeCloseTo(4.2, 9);
  });

  it("home goes to 0, also while playing", () => {
    let s = stop(play(STOPPED, 0), 5);
    s = home(s, 10);
    expect(s.playhead).toBe(0);
    s = play(seek(s, 7, 10), 20);
    s = home(s, 21);
    expect(position(s, 21.5)).toBeCloseTo(0.5, 9);
  });
});

describe("loop region", () => {
  const loop = { start: 2, end: 4 };

  it("repeats once playback reaches the loop end", () => {
    const s = play(STOPPED, 0);
    expect(position(s, 3, loop)).toBeCloseTo(3, 9);
    expect(position(s, 4.5, loop)).toBeCloseTo(2.5, 9);
    expect(position(s, 6.5, loop)).toBeCloseTo(2.5, 9);
    expect(loopPass(s, 3, loop)).toBe(0);
    expect(loopPass(s, 4.5, loop)).toBe(1);
    expect(loopPass(s, 6.5, loop)).toBe(2);
  });

  it("does not apply when playback starts after the loop", () => {
    const s = play(seek(STOPPED, 5, 0), 0);
    expect(position(s, 1, loop)).toBeCloseTo(6, 9);
  });
});
