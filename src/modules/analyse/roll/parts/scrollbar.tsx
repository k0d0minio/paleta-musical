"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { scrollTo, type View } from "../lib/geometry";

/**
 * F259: the visible window across the duration. The thumb shows which part
 * is visible; drag it, press the track, or use the arrow keys.
 */
export function TimeScrollbar({
  view,
  duration,
  onChange,
  label,
  valueText,
  controls,
}: {
  view: View;
  duration: number;
  onChange: (view: View) => void;
  label: string;
  valueText: string;
  controls: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x0: number; start0: number } | null>(null);
  const total = Math.max(duration, view.end - view.start, 1e-6);
  const left = (view.start / total) * 100;
  const width = Math.max(2, ((view.end - view.start) / total) * 100);
  const max = Math.max(0, total - (view.end - view.start));
  const percent = max > 0 ? Math.round((view.start / max) * 100) : 0;

  const secondsAt = (clientX: number) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return ((clientX - rect.left) / rect.width) * total;
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = secondsAt(e.clientX);
    const span = view.end - view.start;
    let start0 = view.start;
    if (t < view.start || t > view.end) {
      start0 = t - span / 2;
      onChange(scrollTo(view, start0, duration));
    }
    drag.current = { x0: e.clientX, start0 };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const rect = track.current?.getBoundingClientRect();
    if (!d || !rect || rect.width === 0) return;
    const dt = ((e.clientX - d.x0) / rect.width) * total;
    onChange(scrollTo(view, d.start0 + dt, duration));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const span = view.end - view.start;
    const step = e.key === "PageUp" || e.key === "PageDown" ? span : span * 0.1;
    const target =
      e.key === "ArrowLeft" || e.key === "PageUp"
        ? view.start - step
        : e.key === "ArrowRight" || e.key === "PageDown"
          ? view.start + step
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? total
              : null;
    if (target === null) return;
    e.preventDefault();
    onChange(scrollTo(view, target, duration));
  };

  return (
    <div
      ref={track}
      role="scrollbar"
      tabIndex={0}
      aria-label={label}
      aria-controls={controls}
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={valueText}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className="relative h-6 w-full cursor-pointer touch-none rounded-full bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <div
        className="absolute inset-y-1 rounded-full bg-fg-subtle"
        style={{ left: `${left}%`, width: `${Math.min(100 - left, width)}%` }}
      />
    </div>
  );
}
