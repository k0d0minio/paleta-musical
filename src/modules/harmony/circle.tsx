"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import {
  CIRCLE_OF_FIFTHS,
  circleIndex,
  circleStep,
  keyRole,
  relativeMinor,
  type PitchClass,
} from "@/theory";
import { cn } from "@/ui/cn";
import { useKeyNames } from "./names";

export type Inspected = { kind: "major" | "minor"; pc: PitchClass } | null;

/** Press and hold this long to inspect on touch (F205 fix). */
const HOLD_MS = 450;

const C = 200;
const OUTER = { r1: 120, r2: 186 };
const INNER = { r1: 66, r2: 116 };
const STEP = 360 / 12;
const GAP = 0.9;

function polar(r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)];
}

function fmt([x, y]: [number, number]): string {
  return `${x.toFixed(2)} ${y.toFixed(2)}`;
}

function sector(r1: number, r2: number, a0: number, a1: number): string {
  return [
    `M ${fmt(polar(r2, a0))}`,
    `A ${r2} ${r2} 0 0 1 ${fmt(polar(r2, a1))}`,
    `L ${fmt(polar(r1, a1))}`,
    `A ${r1} ${r1} 0 0 0 ${fmt(polar(r1, a0))}`,
    "Z",
  ].join(" ");
}

function arc(r: number, from: number, to: number): string {
  const sweep = to > from ? 1 : 0;
  return `M ${fmt(polar(r, from))} A ${r} ${r} 0 0 ${sweep} ${fmt(polar(r, to))}`;
}

const ROMAN: Record<string, string> = {
  tonic: "I",
  dominant: "V",
  subdominant: "IV",
};

export function CircleOfFifths({
  tonic,
  onChooseMajor,
  onChooseMinor,
  onInspect,
}: {
  tonic: PitchClass;
  onChooseMajor: (pc: PitchClass) => void;
  onChooseMinor: (pc: PitchClass) => void;
  onInspect: (inspected: Inspected) => void;
}) {
  const t = useTranslations("modules.harmony");
  const names = useKeyNames();
  const [focusKey, setFocusKey] = useState<PitchClass>(tonic);
  const refs = useRef(new Map<PitchClass, SVGGElement>());
  const hold = useRef<{
    timer: ReturnType<typeof setTimeout> | null;
    held: boolean;
  }>({
    timer: null,
    held: false,
  });
  const focusedRef = useRef<PitchClass | null>(null);
  const tonicAngle = circleIndex(tonic) * STEP;
  const minorOfTonic = relativeMinor(tonic);

  const moveFocus = (to: PitchClass) => {
    setFocusKey(to);
    refs.current.get(to)?.focus();
  };

  const onKeyDown = (pc: PitchClass) => (e: KeyboardEvent<SVGGElement>) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        moveFocus(circleStep(pc, 1));
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        moveFocus(circleStep(pc, -1));
        break;
      case "Home":
        e.preventDefault();
        moveFocus(0);
        break;
      case "Enter":
        e.preventDefault();
        if (e.shiftKey) onChooseMinor(relativeMinor(pc));
        else onChooseMajor(pc);
        break;
      case " ":
        e.preventDefault();
        onChooseMajor(pc);
        break;
    }
  };

  /** Touch: press and hold inspects; a short tap chooses. */
  const pressHandlers = (
    inspected: NonNullable<Inspected>,
    choose: () => void,
  ) => ({
    onPointerDown: (e: PointerEvent<SVGGElement>) => {
      hold.current.held = false;
      if (e.pointerType === "mouse") return;
      if (hold.current.timer) clearTimeout(hold.current.timer);
      hold.current.timer = setTimeout(() => {
        hold.current.held = true;
        onInspect(inspected);
      }, HOLD_MS);
    },
    onPointerUp: () => {
      if (hold.current.timer) clearTimeout(hold.current.timer);
      hold.current.timer = null;
    },
    onPointerCancel: () => {
      if (hold.current.timer) clearTimeout(hold.current.timer);
      hold.current.timer = null;
    },
    onPointerEnter: (e: PointerEvent<SVGGElement>) => {
      if (e.pointerType === "mouse") onInspect(inspected);
    },
    onPointerLeave: (e: PointerEvent<SVGGElement>) => {
      if (e.pointerType !== "mouse") return;
      const focused = focusedRef.current;
      onInspect(focused === null ? null : { kind: "major", pc: focused });
    },
    onClick: () => {
      if (hold.current.held) {
        hold.current.held = false;
        return;
      }
      choose();
    },
    onContextMenu: (e: { preventDefault(): void }) => e.preventDefault(),
  });

  return (
    <svg
      viewBox="-4 -4 408 408"
      role="group"
      aria-label={t("circleLabel")}
      className="mx-auto w-full max-w-[26rem] touch-manipulation select-none [-webkit-touch-callout:none]"
    >
      <defs>
        <marker
          id="harmony-arrow"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" className="fill-fg" />
        </marker>
      </defs>

      {/* Minor keys: inner ring (pointer; keyboard uses Shift+Enter). */}
      <g aria-hidden>
        {CIRCLE_OF_FIFTHS.map((major, i) => {
          const minor = relativeMinor(major);
          const angle = i * STEP;
          const isRelative = minor === minorOfTonic;
          const [lx, ly] = polar((INNER.r1 + INNER.r2) / 2, angle);
          return (
            <g
              key={`m${minor}`}
              data-minor={minor}
              className="cursor-pointer"
              {...pressHandlers({ kind: "minor", pc: minor }, () =>
                onChooseMinor(minor),
              )}
            >
              <path
                d={sector(
                  INNER.r1,
                  INNER.r2,
                  angle - STEP / 2 + GAP,
                  angle + STEP / 2 - GAP,
                )}
                style={{ fill: `var(--note-${minor})` }}
                className={cn(
                  "transition-opacity hover:opacity-100",
                  isRelative ? "stroke-fg" : "opacity-80",
                )}
                strokeWidth={isRelative ? 3 : 0}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none fill-note-on text-[13px] font-semibold"
              >
                {names.minorShort(minor)}
              </text>
            </g>
          );
        })}
      </g>

      {/* Major keys: outer ring, one tab stop, arrows move around (F186, F192, F193). */}
      {CIRCLE_OF_FIFTHS.map((major, i) => {
        const angle = i * STEP;
        const role = keyRole(tonic, major);
        const isTonic = role === "tonic";
        const [lx, ly] = polar((OUTER.r1 + OUTER.r2) / 2 + 6, angle);
        const [rx, ry] = polar(OUTER.r1 + 12, angle);
        const path = sector(
          OUTER.r1,
          OUTER.r2,
          angle - STEP / 2 + GAP,
          angle + STEP / 2 - GAP,
        );
        return (
          <g
            key={major}
            ref={(el) => {
              if (el) refs.current.set(major, el);
              else refs.current.delete(major);
            }}
            role="button"
            tabIndex={major === focusKey ? 0 : -1}
            aria-pressed={isTonic}
            aria-label={t("majorKeyLabel", {
              key: names.majorLetter(major),
              role: t(`roles.${role}`),
            })}
            data-major={major}
            className="group cursor-pointer outline-none"
            onKeyDown={onKeyDown(major)}
            onFocus={() => {
              focusedRef.current = major;
              setFocusKey(major);
              onInspect({ kind: "major", pc: major });
            }}
            onBlur={() => {
              focusedRef.current = null;
            }}
            {...pressHandlers({ kind: "major", pc: major }, () =>
              onChooseMajor(major),
            )}
          >
            <path
              d={path}
              style={{ fill: `var(--note-${major})` }}
              className={cn(isTonic ? "stroke-fg" : "stroke-transparent")}
              strokeWidth={isTonic ? 4 : 0}
            />
            <path
              d={path}
              fill="none"
              strokeWidth={4}
              className="pointer-events-none stroke-focus opacity-0 group-focus-visible:opacity-100"
            />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none fill-note-on text-[20px] font-bold"
            >
              {names.majorLetter(major)}
            </text>
            {ROMAN[role] && (
              <text
                x={rx}
                y={ry}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none fill-note-on text-[11px] font-semibold"
              >
                {ROMAN[role]}
              </text>
            )}
          </g>
        );
      })}

      {/* F189: dominant → tonic, subdominant → tonic, tonic → relative minor. */}
      <g aria-hidden className="pointer-events-none">
        <path
          d={arc(196, tonicAngle + STEP - 3, tonicAngle + 5)}
          markerEnd="url(#harmony-arrow)"
          fill="none"
          strokeWidth={2}
          className="stroke-fg"
        />
        <path
          d={arc(196, tonicAngle - STEP + 3, tonicAngle - 5)}
          markerEnd="url(#harmony-arrow)"
          fill="none"
          strokeWidth={2}
          strokeDasharray="5 4"
          className="stroke-fg"
        />
        <path
          d={`M ${fmt(polar(OUTER.r1 + 4, tonicAngle + 11))} L ${fmt(polar(INNER.r2 - 8, tonicAngle + 11))}`}
          markerEnd="url(#harmony-arrow)"
          fill="none"
          strokeWidth={2}
          strokeDasharray="1.5 3"
          strokeLinecap="round"
          className="stroke-fg"
        />
      </g>

      {/* The current tonic in the middle. */}
      <g aria-hidden className="pointer-events-none">
        <circle cx={C} cy={C} r={INNER.r1 - 6} className="fill-surface" />
        <circle
          cx={C}
          cy={C}
          r={INNER.r1 - 14}
          style={{ fill: `var(--note-${tonic})` }}
        />
        <text
          x={C}
          y={C}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-note-on text-[26px] font-bold"
        >
          {names.majorLetter(tonic)}
        </text>
      </g>
    </svg>
  );
}
