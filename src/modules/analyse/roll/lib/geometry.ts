import { PITCH_COUNT, PITCH_MAX, PITCH_MIN } from "./model";

/**
 * Pixel ↔ music mapping of the roll canvas (pure, CSS pixels).
 * U21: the pitch axis maps MIDI 36–96 exactly: 61 rows of equal height, row
 * `i` from the top is MIDI 96 − i, and a point maps to the row that contains
 * it (floor, not round), so the lowest row (MIDI 36) is shown and reachable.
 */
export interface Layout {
  readonly width: number;
  readonly height: number;
  /** Width of the pitch axis (keys) at the left. */
  readonly keysWidth: number;
  /** Height of the bar ruler at the top. */
  readonly rulerHeight: number;
}

/** The visible time window, in seconds. */
export interface View {
  readonly start: number;
  readonly end: number;
}

export function rowHeight(layout: Layout): number {
  return Math.max(0, layout.height - layout.rulerHeight) / PITCH_COUNT;
}

/** Top edge (y) of the row of a pitch. */
export function pitchTop(midi: number, layout: Layout): number {
  return layout.rulerHeight + (PITCH_MAX - midi) * rowHeight(layout);
}

/** The pitch whose row contains y, or null above or below the rows. */
export function pitchAtY(y: number, layout: Layout): number | null {
  const h = rowHeight(layout);
  if (h <= 0) return null;
  const offset = y - layout.rulerHeight;
  if (offset < 0 || offset >= h * PITCH_COUNT) return null;
  const index = Math.floor(offset / h);
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, PITCH_MAX - index));
}

/** Like `pitchAtY`, but clamps to the nearest row (drags that leave the grid). */
export function pitchAtYClamped(y: number, layout: Layout): number {
  const h = rowHeight(layout);
  const offset = y - layout.rulerHeight;
  const index = Math.floor(offset / Math.max(h, 1e-9));
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, PITCH_MAX - index));
}

export function gridWidth(layout: Layout): number {
  return Math.max(1, layout.width - layout.keysWidth);
}

export function timeToX(t: number, view: View, layout: Layout): number {
  const span = view.end - view.start;
  return layout.keysWidth + ((t - view.start) / span) * gridWidth(layout);
}

export function xToTime(x: number, view: View, layout: Layout): number {
  const span = view.end - view.start;
  return view.start + ((x - layout.keysWidth) / gridWidth(layout)) * span;
}

/** Seconds per CSS pixel. */
export function secondsPerPixel(view: View, layout: Layout): number {
  return (view.end - view.start) / gridWidth(layout);
}

// --- View window (F235, F244, F254, F257–F259) -------------------------------

/** F257: wheel zoom per notch. */
export const WHEEL_ZOOM_IN = 0.88;
export const WHEEL_ZOOM_OUT = 1.12;
/** F257: smallest window for the wheel. */
export const WHEEL_MIN_WINDOW = 0.3;
/** F258: zoom buttons. */
export const BUTTON_ZOOM = 0.65;
export const BUTTON_MIN_WINDOW = 0.5;

/** Keeps the window inside 0…duration (a window longer than the duration shows 0…window). */
export function clampView(view: View, duration: number): View {
  const span = Math.max(1e-6, view.end - view.start);
  const total = Math.max(duration, 1e-6);
  if (span >= total) return { start: 0, end: span };
  const start = Math.min(Math.max(0, view.start), total - span);
  return { start, end: start + span };
}

/** Zooms by a factor around time t (t keeps its place on screen). */
export function zoomAround(
  view: View,
  t: number,
  factor: number,
  duration: number,
  minWindow: number,
): View {
  const span = view.end - view.start;
  const next = Math.min(
    Math.max(minWindow, span * factor),
    Math.max(duration, minWindow),
  );
  const ratio = span > 0 ? (t - view.start) / span : 0;
  const start = t - ratio * next;
  return clampView({ start, end: start + next }, duration);
}

/** F258: zoom in around the centre. */
export function zoomIn(view: View, duration: number): View {
  return zoomAround(
    view,
    (view.start + view.end) / 2,
    BUTTON_ZOOM,
    duration,
    BUTTON_MIN_WINDOW,
  );
}

/** F258: zoom out around the centre, clamped to 0…duration. */
export function zoomOut(view: View, duration: number): View {
  return zoomAround(
    view,
    (view.start + view.end) / 2,
    1 / BUTTON_ZOOM,
    duration,
    BUTTON_MIN_WINDOW,
  );
}

/** F258: the whole duration. */
export function fitView(duration: number): View {
  return { start: 0, end: Math.max(duration, BUTTON_MIN_WINDOW) };
}

/** F259, F254: moves the window to a new start, inside 0…duration. */
export function scrollTo(view: View, start: number, duration: number): View {
  const span = view.end - view.start;
  return clampView({ start, end: start + span }, duration);
}

/** F235: when the playhead passes 90 % of the window, it moves to 10 %. */
export function followPlayhead(view: View, t: number, duration: number): View {
  const span = view.end - view.start;
  if (t < view.start || t > view.start + 0.9 * span) {
    return scrollTo(view, t - 0.1 * span, duration);
  }
  return view;
}

/** F244: during capture, the present stays 3 s before the end of the window. */
export function followLive(view: View, t: number): View {
  const span = view.end - view.start;
  if (t > view.end - 3) {
    const start = Math.max(0, t + 3 - span);
    return { start, end: start + span };
  }
  return view;
}
