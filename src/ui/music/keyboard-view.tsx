"use client";

import type { CSSProperties } from "react";
import { useSounding } from "@/audio";
import { PITCH_CLASSES, type PitchClass } from "@/theory";
import { cn } from "../cn";

const BLACK = new Set<PitchClass>([1, 3, 6, 8, 10]);
const WHITE = PITCH_CLASSES.filter((pc) => !BLACK.has(pc));
/** Left edge of each black key, in white-key widths from C. */
const BLACK_AT: Partial<Record<PitchClass, number>> = {
  1: 1,
  3: 2,
  6: 4,
  8: 5,
  10: 6,
};

function Key({
  pc,
  marked,
  root,
  style,
  black,
}: {
  pc: PitchClass;
  marked: boolean;
  root: boolean;
  style?: CSSProperties;
  black: boolean;
}) {
  const sounding = useSounding(pc);
  return (
    <span
      data-pc={pc}
      data-marked={marked || undefined}
      data-sounding={sounding}
      style={{ "--note": `var(--note-${pc})`, ...style } as CSSProperties}
      className={cn(
        "transition-[background-color,box-shadow] duration-(--duration-fast)",
        black
          ? "absolute top-0 z-10 h-[62%] w-[calc(100%/14*0.62)] -translate-x-1/2 rounded-b-sm bg-neutral-900 dark:bg-neutral-950"
          : "relative h-full flex-1 rounded-b-md border border-border bg-surface",
        marked && "bg-(--note) dark:bg-(--note)",
        root &&
          "after:absolute after:inset-x-1/4 after:bottom-1.5 after:h-1 after:rounded-full after:bg-note-on",
        sounding && "ring-2 ring-fg ring-offset-1 ring-offset-bg",
      )}
    />
  );
}

/**
 * Two octaves of a keyboard, display only: the marked pitch classes are
 * filled with their note colour (F276), the root has a dot and sounding notes
 * get a ring. The label names the marked notes for screen readers.
 */
export function KeyboardView({
  marked,
  root,
  label,
  className,
}: {
  marked: readonly PitchClass[];
  root?: PitchClass | null;
  /** Accessible description, e.g. "Teclado: C, E, G". */
  label: string;
  className?: string;
}) {
  const set = new Set(marked);
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative flex h-28 w-full touch-none gap-px select-none sm:h-32",
        className,
      )}
    >
      {[0, 1].flatMap((octave) =>
        WHITE.map((pc) => (
          <Key
            key={`w${octave}-${pc}`}
            pc={pc}
            black={false}
            marked={set.has(pc)}
            root={root === pc}
          />
        )),
      )}
      {[0, 1].flatMap((octave) =>
        PITCH_CLASSES.filter((pc) => BLACK.has(pc)).map((pc) => (
          <Key
            key={`b${octave}-${pc}`}
            pc={pc}
            black
            marked={set.has(pc)}
            root={root === pc}
            style={{
              left: `calc(${(BLACK_AT[pc] ?? 0) + octave * 7} * (100% / 14))`,
            }}
          />
        )),
      )}
    </div>
  );
}
