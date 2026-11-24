"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { audioEngine } from "@/audio";
import { fromMidi } from "@/theory";
import {
  copyNotes,
  drawNote,
  gridStepSeconds,
  moveNotes,
  notesInBox,
  pasteNotes,
  quantize,
  removeNotes,
  resizeNotes,
  stepSelection,
} from "../lib/edit";
import {
  WHEEL_MIN_WINDOW,
  WHEEL_ZOOM_IN,
  WHEEL_ZOOM_OUT,
  clampView,
  gridWidth,
  pitchAtY,
  pitchAtYClamped,
  scrollTo,
  timeToX,
  xToTime,
  zoomAround,
  zoomIn,
  zoomOut,
  type Layout,
  type View,
} from "../lib/geometry";
import {
  MIN_NOTE_SECONDS,
  noteEnd,
  type RollNote,
  type RollSettings,
  type Tool,
} from "../lib/model";
import {
  currentPosition,
  home,
  play,
  seek,
  setLoop,
  stopPlayback,
  viewOrFit,
} from "../engine/controller";
import { session, useRollSession } from "../engine/session";
import { getRollDoc, setRollDoc, setRollSettings } from "../state";
import { drawRoll, readColors, type Box, type RollColors } from "./draw";

const RULER = 22;
const HANDLE_PX = 7;
const DRAG_PX = 3;

type Gesture =
  | {
      kind: "move";
      ids: ReadonlySet<string>;
      t0: number;
      p0: number;
      x0: number;
      base: readonly RollNote[];
      keepPitch: boolean;
      moved: boolean;
      hitId: string;
      collapseOnClick: boolean;
    }
  | {
      kind: "resize";
      ids: ReadonlySet<string>;
      t0: number;
      base: readonly RollNote[];
    }
  | {
      kind: "draw";
      id: string;
      base: readonly RollNote[];
      x0: number;
      moved: boolean;
    }
  | { kind: "erase"; current: readonly RollNote[]; changed: boolean }
  | {
      kind: "pan";
      x0: number;
      lastY: number;
      view: View;
      touch: boolean;
    }
  | {
      kind: "box";
      t0: number;
      p0: number;
      t1: number;
      p1: number;
      base: ReadonlySet<string>;
    }
  | { kind: "loop"; t0: number; x0: number; t1: number };

interface Pinch {
  d0: number;
  tCentre: number;
  view: View;
}

export interface RollCanvasProps {
  readonly notes: readonly RollNote[];
  readonly bpm: number;
  readonly duration: number;
  readonly settings: RollSettings;
  readonly letters: readonly string[];
  readonly label: string;
  readonly roleDescription: string;
  readonly describedBy: string;
  /** Text for the polite live region (keyboard feedback). */
  readonly onAnnounce: (text: string) => void;
  readonly describeNote: (note: RollNote) => string;
  readonly onExport: () => void;
}

/**
 * The roll: one Canvas 2D (device-pixel-ratio aware) with pointer, touch,
 * wheel and keyboard input (F246–F260). Edits draw a preview during the
 * gesture and write the store once at its end (one undo step per gesture).
 */
export function RollCanvas(props: RollCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef(props);
  const layoutRef = useRef<Layout>({
    width: 600,
    height: 400,
    keysWidth: 52,
    rulerHeight: RULER,
  });
  const colorsRef = useRef<RollColors | null>(null);
  const preview = useRef<readonly RollNote[] | null>(null);
  const boxRef = useRef<Box | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<Pinch | null>(null);
  const dirty = useRef(true);
  const focusId = useRef<string | null>(null);

  useEffect(() => {
    latest.current = props;
    dirty.current = true;
  });

  // Redraw on any session change (view, selection, heatmap, loop, transport).
  useEffect(
    () =>
      useRollSession.subscribe(() => {
        dirty.current = true;
      }),
    [],
  );

  // Size and device pixel ratio.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      layoutRef.current = {
        width: Math.max(100, rect.width),
        height: Math.max(120, rect.height),
        keysWidth: rect.width < 500 ? 40 : 52,
        rulerHeight: RULER,
      };
      canvas.width = Math.round(layoutRef.current.width * dpr);
      canvas.height = Math.round(layoutRef.current.height * dpr);
      dirty.current = true;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  // Colours from the tokens; again when the theme changes.
  useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      colorsRef.current = readColors(root);
      dirty.current = true;
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  // Render loop: draws when something changed, or every frame while playing or capturing.
  useEffect(() => {
    let frame = 0;
    const render = () => {
      const s = session.get();
      if (dirty.current || s.transport.playing || s.capture) {
        dirty.current = false;
        paint();
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
    // paint reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wheel (F257): zoom around the cursor, the page does not scroll.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { x } = local(e);
      const layout = layoutRef.current;
      const view = currentView();
      const { duration } = latest.current;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        const dt = (e.deltaX * (view.end - view.start)) / gridWidth(layout);
        setView(scrollTo(view, view.start + dt, duration));
        return;
      }
      if (e.deltaY === 0) return;
      const t = xToTime(Math.max(x, layout.keysWidth), view, layout);
      setView(
        zoomAround(
          view,
          t,
          e.deltaY < 0 ? WHEEL_ZOOM_IN : WHEEL_ZOOM_OUT,
          duration,
          WHEEL_MIN_WINDOW,
        ),
      );
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  function currentView(): View {
    return viewOrFit(session.get().view, latest.current.duration);
  }

  function setView(view: View) {
    session.set({ view });
  }

  function notesNow(): readonly RollNote[] {
    return preview.current ?? latest.current.notes;
  }

  function paint() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const colors = colorsRef.current;
    if (!canvas || !ctx || !colors) return;
    const s = session.get();
    const p = latest.current;
    const capture = s.capture;
    drawRoll(
      ctx,
      {
        layout: layoutRef.current,
        view: currentView(),
        notes: capture ? capture.analysis.notes() : notesNow(),
        selection: s.selection,
        heatmap: s.heatmap,
        showHeatmap: p.settings.heatmap,
        bpm: p.bpm,
        duration: capture ? Math.max(p.duration, capture.now()) : p.duration,
        playhead: currentPosition(),
        playing: s.transport.playing,
        loop: s.loop,
        box: boxRef.current,
        live: capture ? capture.analysis.active() : [],
        liveTime: capture ? capture.now() : null,
        gridStep: gridStepSeconds(p.settings.grid, p.bpm),
        focusedId: focusId.current,
        letters: p.letters,
      },
      colors,
      window.devicePixelRatio || 1,
    );
  }

  function local(e: { clientX: number; clientY: number }) {
    const rect = canvasRef.current?.getBoundingClientRect();
    return {
      x: e.clientX - (rect?.left ?? 0),
      y: e.clientY - (rect?.top ?? 0),
    };
  }

  /** The topmost note under a point, with a small pixel tolerance. */
  function hitNote(x: number, y: number): RollNote | null {
    const layout = layoutRef.current;
    const midi = pitchAtY(y, layout);
    if (midi === null) return null;
    const view = currentView();
    const notes = notesNow();
    for (let i = notes.length - 1; i >= 0; i--) {
      const n = notes[i];
      if (!n || n.midi !== midi) continue;
      const x0 = timeToX(n.start, view, layout);
      const x1 = timeToX(noteEnd(n), view, layout);
      if (x >= x0 - 2 && x <= x1 + 2) return n;
    }
    return null;
  }

  function onEndHandle(n: RollNote, x: number): boolean {
    const layout = layoutRef.current;
    const view = currentView();
    const x0 = timeToX(n.start, view, layout);
    const x1 = timeToX(noteEnd(n), view, layout);
    return x1 - x0 > HANDLE_PX * 1.5 && x >= x1 - HANDLE_PX && x <= x1 + 2;
  }

  function playPitch(midi: number, seconds: number) {
    audioEngine.unlock();
    audioEngine.playNote(fromMidi(midi), {
      duration: seconds,
      markSeconds: seconds,
    });
  }

  function select(ids: ReadonlySet<string>) {
    session.set({ selection: ids });
  }

  function commit(notes: readonly RollNote[]) {
    preview.current = null;
    setRollDoc({ notes });
  }

  // --- Pointer input (mouse, pen, touch: F252–F260) -----------------------------

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (session.get().capture || session.get().busy === "analysing") return;
    const { x, y } = local(e);
    pointers.current.set(e.pointerId, { x, y });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // A synthetic or ended pointer: the gesture still works without capture.
    }
    e.currentTarget.focus({ preventScroll: true });

    if (e.pointerType === "touch" && pointers.current.size === 2) {
      // Pinch zoom and two-finger pan: the current gesture is cancelled.
      cancelGesture();
      const [a, b] = [...pointers.current.values()];
      if (a && b) {
        const view = currentView();
        pinch.current = {
          d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)),
          tCentre: xToTime((a.x + b.x) / 2, view, layoutRef.current),
          view,
        };
      }
      return;
    }
    if (pointers.current.size > 1) return;

    const layout = layoutRef.current;
    const view = currentView();
    const t = Math.max(0, xToTime(x, view, layout));
    const p = latest.current;

    if (x < layout.keysWidth) {
      const midi = pitchAtY(y, layout);
      if (midi !== null) playPitch(midi, 0.6); // F251
      return;
    }
    if (y < layout.rulerHeight) {
      gesture.current = { kind: "loop", t0: t, x0: x, t1: t };
      return;
    }

    const pitch = pitchAtYClamped(y, layout);
    const tool: Tool = p.settings.tool;
    const notes = p.notes;
    const selection = session.get().selection;

    if (tool === "draw") {
      const n = drawNote(pitch, t, p.bpm);
      preview.current = [...notes, n];
      gesture.current = {
        kind: "draw",
        id: n.id,
        base: preview.current,
        x0: x,
        moved: false,
      };
      select(new Set([n.id]));
      playPitch(n.midi, 0.3);
      dirty.current = true;
      return;
    }
    const hit = hitNote(x, y);
    if (tool === "erase") {
      const current = hit ? removeNotes(notes, new Set([hit.id])) : notes;
      preview.current = current;
      gesture.current = { kind: "erase", current, changed: !!hit };
      dirty.current = true;
      return;
    }
    // Select tool.
    if (hit) {
      if (onEndHandle(hit, x)) {
        const ids = selection.has(hit.id) ? selection : new Set([hit.id]);
        select(ids);
        gesture.current = { kind: "resize", ids, t0: t, base: notes };
        return;
      }
      let ids: ReadonlySet<string>;
      let collapseOnClick = false;
      if (e.shiftKey) {
        const next = new Set(selection);
        next.add(hit.id);
        ids = next;
      } else if (selection.has(hit.id)) {
        ids = selection;
        collapseOnClick = selection.size > 1;
      } else {
        ids = new Set([hit.id]);
      }
      select(ids);
      gesture.current = {
        kind: "move",
        ids,
        t0: t,
        p0: pitch,
        x0: x,
        base: notes,
        keepPitch: false,
        moved: false,
        hitId: hit.id,
        collapseOnClick,
      };
      return;
    }
    if (e.shiftKey) {
      gesture.current = {
        kind: "box",
        t0: t,
        p0: pitch,
        t1: t,
        p1: pitch,
        base: selection,
      };
      return;
    }
    // F254: empty space clears the selection and pans the view.
    select(new Set());
    gesture.current = {
      kind: "pan",
      x0: x,
      lastY: e.clientY,
      view,
      touch: e.pointerType === "touch",
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const { x, y } = local(e);
    if (pointers.current.has(e.pointerId))
      pointers.current.set(e.pointerId, { x, y });
    const layout = layoutRef.current;
    const p = latest.current;

    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const d = Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
      const span0 = pinch.current.view.end - pinch.current.view.start;
      const span = Math.min(
        Math.max(WHEEL_MIN_WINDOW, (span0 * pinch.current.d0) / d),
        Math.max(p.duration, WHEEL_MIN_WINDOW),
      );
      const ratio = ((a.x + b.x) / 2 - layout.keysWidth) / gridWidth(layout);
      const start = pinch.current.tCentre - ratio * span;
      setView(clampView({ start, end: start + span }, p.duration));
      return;
    }

    const g = gesture.current;
    if (!g) {
      updateCursor(e.currentTarget, x, y);
      return;
    }
    const view = currentView();
    const t = xToTime(x, view, layout);
    const pitch = pitchAtYClamped(y, layout);

    switch (g.kind) {
      case "move": {
        if (!g.moved && Math.abs(x - g.x0) < DRAG_PX && pitch === g.p0) return;
        g.moved = true;
        // F252: Shift while dragging keeps the pitch.
        const dp = e.shiftKey ? 0 : pitch - g.p0;
        preview.current = moveNotes(g.base, g.ids, t - g.t0, dp);
        break;
      }
      case "resize":
        preview.current = resizeNotes(g.base, g.ids, t - g.t0);
        break;
      case "draw":
        // A press without a drag keeps the half-beat note (F255).
        if (!g.moved && Math.abs(x - g.x0) < DRAG_PX) return;
        g.moved = true;
        preview.current = g.base.map((n) =>
          n.id === g.id
            ? {
                ...n,
                duration: Math.max(MIN_NOTE_SECONDS, t - n.start),
              }
            : n,
        );
        break;
      case "erase": {
        const hit = hitNote(x, y);
        if (hit) {
          g.current = removeNotes(g.current, new Set([hit.id]));
          g.changed = true;
          preview.current = g.current;
        }
        break;
      }
      case "pan": {
        const dt =
          ((g.x0 - x) * (g.view.end - g.view.start)) / gridWidth(layout);
        setView(scrollTo(g.view, g.view.start + dt, p.duration));
        // Touch: a vertical swipe on empty space still scrolls the page (F260).
        if (g.touch) {
          window.scrollBy(0, g.lastY - e.clientY);
          g.lastY = e.clientY;
        }
        break;
      }
      case "box":
        g.t1 = t;
        g.p1 = pitch;
        boxRef.current = { t0: g.t0, t1: g.t1, p0: g.p0, p1: g.p1 };
        select(
          new Set([
            ...g.base,
            ...notesInBox(latest.current.notes, g.t0, g.t1, g.p0, g.p1),
          ]),
        );
        break;
      case "loop":
        g.t1 = Math.max(0, t);
        if (Math.abs(x - g.x0) >= DRAG_PX) {
          session.set({
            loop: {
              start: Math.min(g.t0, g.t1),
              end: Math.max(g.t0, g.t1),
            },
          });
        }
        break;
    }
    dirty.current = true;
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(e.pointerId);
    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null;
      return;
    }
    const g = gesture.current;
    gesture.current = null;
    boxRef.current = null;
    dirty.current = true;
    if (!g) return;
    switch (g.kind) {
      case "move":
        if (g.moved && preview.current) commit(preview.current);
        else {
          preview.current = null;
          if (g.collapseOnClick && !e.shiftKey) select(new Set([g.hitId]));
        }
        break;
      case "resize":
      case "draw":
        if (preview.current) commit(preview.current);
        break;
      case "erase":
        if (g.changed) commit(g.current);
        else preview.current = null;
        break;
      case "loop": {
        const { x } = local(e);
        if (Math.abs(x - g.x0) < DRAG_PX) {
          seek(g.t0);
        } else {
          setLoop({
            start: Math.min(g.t0, g.t1),
            end: Math.max(g.t0, g.t1),
          });
        }
        break;
      }
      default:
        break;
    }
  }

  function cancelGesture() {
    gesture.current = null;
    preview.current = null;
    boxRef.current = null;
    dirty.current = true;
  }

  function onPointerCancel(e: React.PointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    cancelGesture();
  }

  function updateCursor(canvas: HTMLCanvasElement, x: number, y: number) {
    const layout = layoutRef.current;
    let cursor = "default";
    if (x < layout.keysWidth) cursor = "pointer";
    else if (y < layout.rulerHeight) cursor = "text";
    else {
      const tool = latest.current.settings.tool;
      const hit = hitNote(x, y);
      if (tool === "draw") cursor = "crosshair";
      else if (tool === "erase") cursor = hit ? "pointer" : "default";
      else if (hit) cursor = onEndHandle(hit, x) ? "ew-resize" : "grab";
      else cursor = "grab";
    }
    if (canvas.style.cursor !== cursor) canvas.style.cursor = cursor;
  }

  // --- Keyboard (select, move, delete, play, export) -------------------------------

  function announceSelection(
    ids: ReadonlySet<string>,
    notes: readonly RollNote[],
  ) {
    const p = latest.current;
    const first = notes.find((n) => ids.has(n.id));
    if (ids.size === 1 && first) p.onAnnounce(p.describeNote(first));
    else p.onAnnounce(String(ids.size));
  }

  function revealNote(n: RollNote) {
    const view = currentView();
    if (n.start < view.start || noteEnd(n) > view.end) {
      setView(
        scrollTo(
          view,
          n.start - (view.end - view.start) * 0.2,
          latest.current.duration,
        ),
      );
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLCanvasElement>) {
    const p = latest.current;
    const s = session.get();
    const mod = e.ctrlKey || e.metaKey;
    const notes = getRollDoc().notes;
    const selection = s.selection;
    const handled = () => {
      e.preventDefault();
      e.stopPropagation();
      dirty.current = true;
    };
    if (s.capture) return;

    if (e.key === " " || e.code === "Space") {
      handled();
      if (s.transport.playing) stopPlayback();
      else void play();
      return;
    }
    if (mod && e.key.toLowerCase() === "a") {
      handled();
      const all = new Set(notes.map((n) => n.id));
      select(all);
      p.onAnnounce(String(all.size));
      return;
    }
    if (mod && e.key.toLowerCase() === "c") {
      handled();
      session.set({ clipboard: copyNotes(notes, selection) });
      return;
    }
    if (mod && e.key.toLowerCase() === "x") {
      handled();
      session.set({ clipboard: copyNotes(notes, selection) });
      if (selection.size > 0) {
        setRollDoc({ notes: removeNotes(notes, selection) });
        select(new Set());
      }
      return;
    }
    if (mod && e.key.toLowerCase() === "v") {
      handled();
      if (s.clipboard.length === 0) return;
      const pasted = pasteNotes(s.clipboard, currentPosition());
      setRollDoc({ notes: [...notes, ...pasted] });
      select(new Set(pasted.map((n) => n.id)));
      return;
    }
    if (mod || e.altKey) return;

    switch (e.key) {
      case "Delete":
      case "Backspace":
        handled();
        if (selection.size > 0) {
          setRollDoc({ notes: removeNotes(notes, selection) });
          select(new Set());
          p.onAnnounce("0");
        }
        return;
      case "q":
      case "Q":
        handled();
        setRollDoc({
          notes: quantize(
            notes,
            p.settings.grid,
            p.bpm,
            selection.size > 0 ? selection : undefined,
          ),
        });
        return;
      case "1":
      case "2":
      case "3":
        handled();
        setRollSettings({
          tool: (["select", "draw", "erase"] as const)[Number(e.key) - 1],
        });
        return;
      case "Home":
        handled();
        home();
        return;
      case "Escape":
        if (selection.size > 0) {
          select(new Set());
          e.preventDefault();
        }
        return;
      case "+":
      case "=":
        handled();
        setView(zoomIn(currentView(), p.duration));
        return;
      case "-":
        handled();
        setView(zoomOut(currentView(), p.duration));
        return;
      case "[":
      case "]": {
        handled();
        const next = stepSelection(
          notes,
          focusId.current && selection.has(focusId.current)
            ? focusId.current
            : null,
          e.key === "]" ? 1 : -1,
        );
        if (!next) return;
        focusId.current = next.id;
        const ids = e.shiftKey
          ? new Set([...selection, next.id])
          : new Set([next.id]);
        select(ids);
        revealNote(next);
        announceSelection(ids, notes);
        return;
      }
      case "Enter": {
        const n = notes.find((x) => selection.has(x.id));
        if (n) {
          handled();
          playPitch(n.midi, Math.min(1.5, Math.max(0.2, n.duration)));
        }
        return;
      }
      case "ArrowLeft":
      case "ArrowRight":
      case "ArrowUp":
      case "ArrowDown": {
        if (selection.size === 0) {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            handled();
            const view = currentView();
            const span = view.end - view.start;
            setView(
              scrollTo(
                view,
                view.start + (e.key === "ArrowLeft" ? -0.2 : 0.2) * span,
                p.duration,
              ),
            );
          }
          return;
        }
        handled();
        const step = e.shiftKey
          ? 60 / p.bpm
          : gridStepSeconds(p.settings.grid, p.bpm);
        const dt =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dp =
          e.key === "ArrowUp"
            ? e.shiftKey
              ? 12
              : 1
            : e.key === "ArrowDown"
              ? e.shiftKey
                ? -12
                : -1
              : 0;
        const moved = moveNotes(notes, selection, dt, dp);
        setRollDoc({ notes: moved });
        announceSelection(selection, moved);
        return;
      }
      case "e":
      case "E":
        handled();
        p.onExport();
        return;
      default:
        return;
    }
  }

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="application"
        aria-roledescription={props.roleDescription}
        aria-label={props.label}
        aria-describedby={props.describedBy}
        data-testid="piano-roll-canvas"
        className="block h-full w-full touch-none rounded-xl outline-none select-none focus-visible:ring-2 focus-visible:ring-focus"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
