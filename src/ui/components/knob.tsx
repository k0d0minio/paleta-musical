"use client";

import {
  type CSSProperties,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { NOTE_KEYS_PASS_ATTRIBUTE } from "@/input/sources/keyboard";
import { cn } from "../cn";

/** Steps of the rotary control, as a part of the range (S015–S017 of the synth spec). */
export const KNOB_STEPS = {
  dragPerPixel: 0.006,
  dragPerPixelFine: 0.0015,
  wheel: 0.025,
  wheelFine: 0.005,
  arrow: 0.02,
  page: 0.1,
} as const;

/** A second tap within this time resets the control (the touch double-click). */
const DOUBLE_TAP_MS = 300;
/** The arc: 270°, from −135° to +135° (0° is up). */
const SWEEP = 270;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** The position after a key, or null when the key does not move the control. */
export function knobKeyStep(key: string, position: number): number | null {
  switch (key) {
    case "ArrowUp":
    case "ArrowRight":
      return clamp01(position + KNOB_STEPS.arrow);
    case "ArrowDown":
    case "ArrowLeft":
      return clamp01(position - KNOB_STEPS.arrow);
    case "PageUp":
      return clamp01(position + KNOB_STEPS.page);
    case "PageDown":
      return clamp01(position - KNOB_STEPS.page);
    case "Home":
      return 0;
    case "End":
      return 1;
    default:
      return null;
  }
}

function point(angle: number, r: number, c: number): [number, number] {
  const rad = (angle * Math.PI) / 180;
  return [c + r * Math.sin(rad), c - r * Math.cos(rad)];
}

function arc(from: number, to: number, r: number, c: number): string {
  const [x1, y1] = point(from, r, c);
  const [x2, y2] = point(to, r, c);
  const large = to - from > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

interface Latest {
  value: number;
  defaultValue: number;
  onValueChange: (value: number) => void;
}

/** Sends a new position, clamped, when it differs from the current one. */
function apply(latest: Latest, next: number): void {
  const n = clamp01(next);
  if (n === latest.value) return;
  latest.value = n;
  latest.onValueChange(n);
}

export interface KnobProps {
  /** The name, shown under the control and given to assistive technology. */
  label: string;
  /** A longer name for assistive technology when the short label is not unique (e.g. "Echo mix"). */
  accessibleLabel?: string;
  /** The position, 0–1 of the range. */
  value: number;
  /** The position that a double-click (or a double tap) sets. */
  defaultValue: number;
  onValueChange: (value: number) => void;
  /** The value in its unit, e.g. "2,2 kHz" (shown and announced). */
  valueText: string;
  /** Optional: an accent colour (a CSS colour, e.g. a note token). Default: ink. */
  accent?: string;
  className?: string;
}

/**
 * A rotary control (S013–S019 of the synth spec). Drag up or down (Shift:
 * fine), the wheel (Shift: fine), the arrow, Page, Home and End keys, and a
 * double-click or double tap resets it. For assistive technology it is a
 * slider from 0 to 100 with the value text in its unit.
 */
export function Knob({
  label,
  accessibleLabel,
  value,
  defaultValue,
  onValueChange,
  valueText,
  accent,
  className,
}: KnobProps) {
  const labelId = useId();
  const dialRef = useRef<HTMLDivElement>(null);
  const latest = useRef<Latest>({ value, defaultValue, onValueChange });
  const drag = useRef<{ id: number; y: number; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    latest.current = { value, defaultValue, onValueChange };
  });

  const set = (next: number) => apply(latest.current, next);

  // S016: the wheel. A native listener, so that it can stop the page from scrolling.
  useEffect(() => {
    const dial = dialRef.current;
    if (!dial) return;
    const onWheel = (event: WheelEvent) => {
      // Shift + wheel scrolls sideways in some browsers: use either axis.
      const delta = event.deltaY || event.deltaX;
      if (delta === 0) return;
      event.preventDefault();
      const step = event.shiftKey ? KNOB_STEPS.wheelFine : KNOB_STEPS.wheel;
      apply(latest.current, latest.current.value + (delta < 0 ? step : -step));
    };
    dial.addEventListener("wheel", onWheel, { passive: false });
    return () => dial.removeEventListener("wheel", onWheel);
  }, []);

  const reset = () => set(latest.current.defaultValue);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    // S018 on touch: a second tap soon after a tap (without a drag) resets.
    if (
      event.pointerType !== "mouse" &&
      event.timeStamp - lastTap.current < DOUBLE_TAP_MS
    ) {
      lastTap.current = 0;
      reset();
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
    event.preventDefault(); // no text selection (S034)
    drag.current = { id: event.pointerId, y: event.clientY, moved: false };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dy = d.y - event.clientY;
    d.y = event.clientY;
    if (dy === 0) return;
    d.moved = true;
    const rate = event.shiftKey
      ? KNOB_STEPS.dragPerPixelFine
      : KNOB_STEPS.dragPerPixel;
    set(latest.current.value + dy * rate);
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (d?.id !== event.pointerId) return;
    lastTap.current =
      event.pointerType !== "mouse" && !d.moved ? event.timeStamp : 0;
    drag.current = null;
    setDragging(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const next = knobKeyStep(event.key, latest.current.value);
    if (next === null) return;
    event.preventDefault();
    set(next);
  };

  const position = clamp01(value);
  const start = -SWEEP / 2;
  const angle = start + position * SWEEP;
  const size = 56;
  const c = size / 2;
  const r = 23;
  const [tx, ty] = point(angle, r - 8, c);
  const [ix, iy] = point(angle, r - 15, c);

  return (
    <div
      className={cn(
        "flex w-20 flex-col items-center gap-1 text-center select-none",
        className,
      )}
    >
      <div
        ref={dialRef}
        role="slider"
        tabIndex={0}
        aria-labelledby={accessibleLabel ? undefined : labelId}
        aria-label={accessibleLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position * 100)}
        aria-valuetext={valueText}
        aria-orientation="vertical"
        {...{ [NOTE_KEYS_PASS_ATTRIBUTE]: "" }}
        data-dragging={dragging || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onDoubleClick={reset}
        onKeyDown={onKeyDown}
        style={
          accent ? ({ "--knob-accent": accent } as CSSProperties) : undefined
        }
        className={cn(
          "group relative grid size-14 cursor-ns-resize touch-none place-items-center rounded-full",
          "[--knob-accent:var(--fg)]",
        )}
      >
        <svg
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden
          className="size-full overflow-visible"
        >
          <path
            d={arc(start, start + SWEEP, r, c)}
            fill="none"
            strokeLinecap="round"
            strokeWidth={4}
            className="stroke-surface-2"
          />
          {position > 0.002 && (
            <path
              d={arc(start, angle, r, c)}
              fill="none"
              strokeLinecap="round"
              strokeWidth={4}
              className="stroke-(--knob-accent)"
            />
          )}
          <circle
            cx={c}
            cy={c}
            r={r - 6}
            className="fill-surface stroke-border transition-[stroke] duration-(--duration-fast) group-hover:stroke-border-strong group-data-dragging:stroke-fg-subtle"
            strokeWidth={1}
          />
          <line
            x1={ix}
            y1={iy}
            x2={tx}
            y2={ty}
            strokeLinecap="round"
            strokeWidth={3}
            className="stroke-fg"
          />
        </svg>
      </div>
      <span
        id={labelId}
        className="text-xs leading-tight font-medium text-fg-muted"
      >
        {label}
      </span>
      <output
        aria-hidden
        className="text-sm leading-tight font-semibold text-fg tabular"
      >
        {valueText}
      </output>
    </div>
  );
}
