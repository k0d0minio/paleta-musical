import { describe, expect, it } from "vitest";
import {
  clampView,
  followLive,
  followPlayhead,
  pitchAtY,
  pitchTop,
  rowHeight,
  timeToX,
  xToTime,
  zoomAround,
  zoomIn,
  zoomOut,
  fitView,
  scrollTo,
  type Layout,
} from "./geometry";
import { PITCH_MAX, PITCH_MIN } from "./model";

const layout: Layout = {
  width: 900,
  height: 24 + 61 * 9.5,
  keysWidth: 56,
  rulerHeight: 24,
};

describe("U21: the pitch axis maps MIDI 36–96 exactly", () => {
  const h = rowHeight(layout);

  it("has 61 rows of equal height", () => {
    expect(h).toBeCloseTo(9.5, 9);
    expect(pitchTop(PITCH_MAX, layout)).toBe(layout.rulerHeight);
    expect(pitchTop(PITCH_MIN, layout) + h).toBeCloseTo(layout.height, 9);
  });

  it("hits each pitch row at its centre and at its edges", () => {
    for (let midi = PITCH_MIN; midi <= PITCH_MAX; midi++) {
      const top = pitchTop(midi, layout);
      expect(pitchAtY(top + h / 2, layout)).toBe(midi);
      expect(pitchAtY(top, layout)).toBe(midi);
      expect(pitchAtY(top + h - 1e-6, layout)).toBe(midi);
    }
  });

  it("reaches the lowest pitch (36) and nothing outside the rows", () => {
    expect(pitchAtY(layout.height - 0.01, layout)).toBe(36);
    expect(pitchAtY(layout.height, layout)).toBeNull();
    expect(pitchAtY(layout.rulerHeight - 0.01, layout)).toBeNull();
  });
});

describe("time axis and view window", () => {
  const view = { start: 2, end: 12 };

  it("maps time to x and back", () => {
    expect(timeToX(2, view, layout)).toBe(layout.keysWidth);
    expect(timeToX(12, view, layout)).toBe(layout.width);
    expect(xToTime(timeToX(7.3, view, layout), view, layout)).toBeCloseTo(
      7.3,
      9,
    );
  });

  it("F257: wheel zoom keeps the time under the cursor, minimum 0.3 s", () => {
    const zoomed = zoomAround(view, 4, 0.88, 30, 0.3);
    expect(zoomed.end - zoomed.start).toBeCloseTo(8.8, 9);
    expect((4 - zoomed.start) / (zoomed.end - zoomed.start)).toBeCloseTo(
      0.2,
      9,
    );
    let v = view;
    for (let i = 0; i < 100; i++) v = zoomAround(v, 4, 0.88, 30, 0.3);
    expect(v.end - v.start).toBeCloseTo(0.3, 9);
  });

  it("F258: zoom buttons and fit", () => {
    const zin = zoomIn(view, 30);
    expect(zin.end - zin.start).toBeCloseTo(6.5, 9);
    expect((zin.start + zin.end) / 2).toBeCloseTo(7, 9);
    const zout = zoomOut({ start: 0, end: 25 }, 30);
    expect(zout).toEqual({ start: 0, end: 30 });
    expect(fitView(42)).toEqual({ start: 0, end: 42 });
  });

  it("F259, F254: scrolling stays inside 0…duration", () => {
    expect(scrollTo(view, -5, 30)).toEqual({ start: 0, end: 10 });
    expect(scrollTo(view, 25, 30)).toEqual({ start: 20, end: 30 });
    expect(clampView({ start: 5, end: 50 }, 20)).toEqual({ start: 0, end: 45 });
  });

  it("F235: the playhead past 90 % moves the window so it is at 10 %", () => {
    expect(followPlayhead(view, 10, 60)).toBe(view);
    const next = followPlayhead(view, 11.5, 60);
    expect(next.start).toBeCloseTo(10.5, 9);
  });

  it("F244: during capture, the present stays 3 s before the end", () => {
    const live = { start: 0, end: 30 };
    expect(followLive(live, 20)).toBe(live);
    expect(followLive(live, 40)).toEqual({ start: 13, end: 43 });
  });
});
