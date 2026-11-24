import {
  pitchTop,
  rowHeight,
  timeToX,
  type Layout,
  type View,
} from "../lib/geometry";
import { firstFrameAfter, frameEnd, type Heatmap } from "../lib/heatmap";
import { PITCH_COUNT, PITCH_MAX, PITCH_MIN, type RawNote } from "../lib/model";
import type { ActiveNote } from "../lib/tracker";
import type { Loop } from "../lib/transport";

/** Colours read from the design tokens (CSS custom properties). */
export interface RollColors {
  readonly bg: string;
  readonly surface: string;
  readonly sunken: string;
  readonly border: string;
  readonly borderStrong: string;
  readonly fg: string;
  readonly muted: string;
  readonly subtle: string;
  readonly accent: string;
  readonly noteOn: string;
  readonly notes: readonly string[];
}

export function readColors(el: Element): RollColors {
  const css = getComputedStyle(el);
  const v = (name: string, fallback: string) =>
    css.getPropertyValue(name).trim() || fallback;
  return {
    bg: v("--bg", "#ffffff"),
    surface: v("--surface", "#ffffff"),
    sunken: v("--surface-sunken", "#f3f3f5"),
    border: v("--border", "#e4e4e7"),
    borderStrong: v("--border-strong", "#a1a1aa"),
    fg: v("--fg", "#0b0c0f"),
    muted: v("--fg-muted", "#52525b"),
    subtle: v("--fg-subtle", "#a1a1aa"),
    accent: v("--accent", "#3b82f6"),
    noteOn: v("--note-on", "#0b0c0f"),
    notes: Array.from({ length: 12 }, (_, pc) => v(`--note-${pc}`, "#888888")),
  };
}

export interface Box {
  readonly t0: number;
  readonly t1: number;
  readonly p0: number;
  readonly p1: number;
}

export interface Scene {
  readonly layout: Layout;
  readonly view: View;
  /** Roll notes (with ids), or the captured notes during a capture. */
  readonly notes: readonly (RawNote & { readonly id?: string })[];
  readonly selection: ReadonlySet<string>;
  readonly heatmap: Heatmap | null;
  readonly showHeatmap: boolean;
  readonly bpm: number;
  readonly duration: number;
  readonly playhead: number;
  readonly playing: boolean;
  readonly loop: Loop | null;
  readonly box: Box | null;
  /** Notes that sound now during a capture. */
  readonly live: readonly ActiveNote[];
  /** The present time during a capture, else null. */
  readonly liveTime: number | null;
  /** Grid step in seconds (subdivision lines). */
  readonly gridStep: number;
  readonly focusedId: string | null;
  /** Letter names of the 12 pitch classes (spelling setting). */
  readonly letters: readonly string[];
}

const BLACK = new Set([1, 3, 6, 8, 10]);

function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  if (color.startsWith("#") && color.length === 7) {
    return `${color}${Math.round(a * 255)
      .toString(16)
      .padStart(2, "0")}`;
  }
  return color;
}

export function drawRoll(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  colors: RollColors,
  dpr: number,
): void {
  const { layout, view } = scene;
  const { width, height, keysWidth, rulerHeight } = layout;
  const rowH = rowHeight(layout);
  const x = (t: number) => timeToX(t, view, layout);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = colors.surface;
  ctx.fillRect(0, 0, width, height);

  // Grid area clip.
  ctx.save();
  ctx.beginPath();
  ctx.rect(keysWidth, rulerHeight, width - keysWidth, height - rulerHeight);
  ctx.clip();

  // Rows: black-key rows are sunken; a line above each C.
  for (let midi = PITCH_MIN; midi <= PITCH_MAX; midi++) {
    const y = pitchTop(midi, layout);
    if (BLACK.has(midi % 12)) {
      ctx.fillStyle = colors.sunken;
      ctx.fillRect(keysWidth, y, width - keysWidth, rowH);
    }
    if (midi % 12 === 0) {
      ctx.fillStyle = colors.border;
      ctx.fillRect(keysWidth, y + rowH - 1, width - keysWidth, 1);
    }
  }

  // Beyond the duration.
  const endX = x(scene.duration);
  if (endX < width) {
    ctx.fillStyle = withAlpha(colors.sunken, 0.7);
    ctx.fillRect(endX, rulerHeight, width - endX, height - rulerHeight);
  }

  // Heatmap (F248): the energy of each pitch per frame, in the note colour.
  const heat = scene.heatmap;
  if (scene.showHeatmap && heat && heat.count > 0) {
    const pxPerSecond = (width - keysWidth) / (view.end - view.start);
    const step = Math.max(
      1,
      Math.floor(1 / Math.max(1e-6, heat.frameSeconds * pxPerSecond)),
    );
    const first = Math.max(0, firstFrameAfter(heat, view.start));
    for (let f = first; f < heat.count; f += step) {
      const t0 = heat.times[f] ?? 0;
      if (t0 > view.end) break;
      const x0 = x(t0);
      const x1 = x(frameEnd(heat, Math.min(heat.count - 1, f + step - 1)));
      const w = Math.max(1, x1 - x0);
      const offset = f * PITCH_COUNT;
      for (let p = 0; p < PITCH_COUNT; p++) {
        const value = heat.values[offset + p] ?? 0;
        if (value < 0.04) continue;
        const midi = PITCH_MIN + p;
        ctx.fillStyle = withAlpha(
          colors.notes[midi % 12] ?? "#888888",
          value * 0.55,
        );
        ctx.fillRect(x0, pitchTop(midi, layout), w, rowH);
      }
    }
  }

  // Beat grid (F247): subdivisions, beats, bars.
  const beat = 60 / scene.bpm;
  const pxPerBeat = x(beat) - x(0);
  const sub = scene.gridStep;
  const pxPerSub = x(sub) - x(0);
  if (pxPerSub >= 8) {
    ctx.fillStyle = withAlpha(colors.border, 0.6);
    for (let i = Math.ceil(view.start / sub); i * sub <= view.end; i++) {
      ctx.fillRect(
        Math.round(x(i * sub)),
        rulerHeight,
        1,
        height - rulerHeight,
      );
    }
  }
  const beatEvery = pxPerBeat >= 6 ? 1 : pxPerBeat * 4 >= 6 ? 4 : 16;
  for (let i = Math.ceil(view.start / beat); i * beat <= view.end; i++) {
    if (i % beatEvery !== 0) continue;
    ctx.fillStyle = i % 4 === 0 ? colors.borderStrong : colors.border;
    ctx.fillRect(Math.round(x(i * beat)), rulerHeight, 1, height - rulerHeight);
  }

  // Loop region.
  if (scene.loop) {
    ctx.fillStyle = withAlpha(colors.accent, 0.08);
    const lx = x(scene.loop.start);
    ctx.fillRect(lx, rulerHeight, x(scene.loop.end) - lx, height - rulerHeight);
  }

  // Notes (F249): colour of the pitch class (F276), letter, velocity bar, selection.
  ctx.font = `600 ${Math.max(7, Math.min(11, rowH - 1))}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  for (const n of scene.notes) {
    if (n.start > view.end || n.start + n.duration < view.start) continue;
    drawNote(ctx, scene, colors, n.midi, n.start, n.duration, n.velocity, {
      selected: n.id !== undefined && scene.selection.has(n.id),
      focused: n.id !== undefined && scene.focusedId === n.id,
    });
  }
  if (scene.liveTime !== null) {
    for (const n of scene.live) {
      drawNote(
        ctx,
        scene,
        colors,
        n.midi,
        n.start,
        Math.max(0.02, scene.liveTime - n.start),
        n.velocity,
        {
          selected: false,
          focused: false,
        },
      );
    }
  }

  // Selection box.
  if (scene.box) {
    const bx0 = x(Math.min(scene.box.t0, scene.box.t1));
    const bx1 = x(Math.max(scene.box.t0, scene.box.t1));
    const by0 = pitchTop(Math.max(scene.box.p0, scene.box.p1), layout);
    const by1 = pitchTop(Math.min(scene.box.p0, scene.box.p1), layout) + rowH;
    ctx.fillStyle = withAlpha(colors.accent, 0.12);
    ctx.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx0 + 0.5, by0 + 0.5, bx1 - bx0 - 1, by1 - by0 - 1);
  }
  ctx.restore();

  // Ruler: bar numbers (F247), loop, playhead.
  ctx.fillStyle = colors.bg;
  ctx.fillRect(keysWidth, 0, width - keysWidth, rulerHeight);
  ctx.fillStyle = colors.border;
  ctx.fillRect(keysWidth, rulerHeight - 1, width - keysWidth, 1);
  if (scene.loop) {
    ctx.fillStyle = withAlpha(colors.accent, 0.35);
    const lx = x(scene.loop.start);
    ctx.fillRect(lx, rulerHeight - 6, x(scene.loop.end) - lx, 5);
  }
  const bar = beat * 4;
  const pxPerBar = x(bar) - x(0);
  const labelEvery = Math.max(1, Math.ceil(28 / Math.max(1, pxPerBar)));
  ctx.font = "500 10px ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.save();
  ctx.beginPath();
  ctx.rect(keysWidth, 0, width - keysWidth, rulerHeight);
  ctx.clip();
  for (
    let i = Math.max(0, Math.floor(view.start / bar));
    i * bar <= view.end;
    i++
  ) {
    const bx = Math.round(x(i * bar));
    ctx.fillStyle = colors.borderStrong;
    ctx.fillRect(bx, rulerHeight - 8, 1, 8);
    if (i % labelEvery === 0) {
      ctx.fillStyle = colors.muted;
      ctx.fillText(String(i + 1), bx + 3, rulerHeight / 2 - 1);
    }
  }
  ctx.restore();

  // Playhead (F235) and the present time of a capture.
  const head = scene.liveTime ?? scene.playhead;
  const hx = x(head);
  if (hx >= keysWidth && hx <= width) {
    ctx.fillStyle =
      scene.liveTime !== null ? (colors.notes[0] ?? colors.fg) : colors.fg;
    ctx.fillRect(Math.round(hx) - 1, 0, 2, height);
    ctx.beginPath();
    ctx.moveTo(hx - 5, 0);
    ctx.lineTo(hx + 5, 0);
    ctx.lineTo(hx, 7);
    ctx.closePath();
    ctx.fill();
  }

  // Pitch axis (F246): key column, C named with its octave (C2…C7).
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, keysWidth, height);
  ctx.font = `600 ${Math.max(8, Math.min(10, rowH))}px ui-sans-serif, system-ui, sans-serif`;
  for (let midi = PITCH_MIN; midi <= PITCH_MAX; midi++) {
    const y = pitchTop(midi, layout);
    const pc = midi % 12;
    const black = BLACK.has(pc);
    ctx.fillStyle = black ? colors.fg : colors.surface;
    ctx.fillRect(
      black ? keysWidth * 0.35 : 0,
      y,
      black ? keysWidth * 0.65 - 1 : keysWidth - 1,
      rowH,
    );
    ctx.fillStyle = withAlpha(colors.notes[pc] ?? "#888", 1);
    ctx.fillRect(keysWidth - 4, y + 0.5, 3, rowH - 1);
    if (!black) {
      ctx.fillStyle = colors.border;
      ctx.fillRect(0, y + rowH - 0.5, keysWidth * 0.35, 0.5);
    }
    if (pc === 0) {
      ctx.fillStyle = colors.fg;
      ctx.fillText(`C${midi / 12 - 1}`, 3, y + rowH / 2);
    }
  }
  ctx.fillStyle = colors.border;
  ctx.fillRect(keysWidth - 1, 0, 1, height);
}

function drawNote(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  colors: RollColors,
  midi: number,
  start: number,
  duration: number,
  velocity: number,
  state: { selected: boolean; focused: boolean },
): void {
  const { layout, view } = scene;
  const rowH = rowHeight(layout);
  const x0 = timeToX(start, view, layout);
  const x1 = timeToX(start + duration, view, layout);
  const w = Math.max(2, x1 - x0);
  const y = pitchTop(midi, layout) + 0.5;
  const h = Math.max(2, rowH - 1);
  const pc = midi % 12;
  const color = colors.notes[pc] ?? "#888888";
  ctx.fillStyle = withAlpha(color, 0.55 + 0.45 * (velocity / 127));
  ctx.fillRect(x0, y, w, h);
  // Velocity: a bar along the bottom edge, as long as velocity/127 of the note.
  ctx.fillStyle = withAlpha(colors.noteOn, 0.45);
  ctx.fillRect(
    x0,
    y + h - Math.max(1, h * 0.18),
    w * (velocity / 127),
    Math.max(1, h * 0.18),
  );
  if (state.selected || state.focused) {
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = state.selected ? 2 : 1;
    ctx.setLineDash(state.focused && !state.selected ? [3, 2] : []);
    ctx.strokeRect(x0 + 1, y + 1, w - 2, h - 2);
    ctx.setLineDash([]);
  }
  if (w > 14 && h >= 6.5) {
    ctx.fillStyle = colors.noteOn;
    ctx.fillText(scene.letters[pc] ?? "", x0 + 3, y + h / 2 + 0.5);
  }
}
