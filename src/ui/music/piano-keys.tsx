"use client";

import { useTranslations } from "next-intl";
import type { CSSProperties } from "react";
import { useSounding } from "@/audio";
import { pointerSource } from "@/input/sources/pointer";
import { useOctave } from "@/state";
import { PITCH_CLASSES, type PitchClass } from "@/theory";
import { cn } from "../cn";
import { rovingKeyDown } from "../roving";
import { useNoteNameText } from "./note-name";

const BLACK = new Set<PitchClass>([1, 3, 6, 8, 10]);
/** Left offset of each black key, in white-key widths. */
const BLACK_OFFSET: Partial<Record<PitchClass, number>> = { 1: 1, 3: 2, 6: 4, 8: 5, 10: 6 };

function Key({ pc, octave, index }: { pc: PitchClass; octave: number; index: number }) {
  const sounding = useSounding(pc);
  const name = useNoteNameText();
  const black = BLACK.has(pc);
  const press = () => pointerSource.press({ pc, octave });
  return (
    <button
      type="button"
      data-roving
      data-sounding={sounding}
      tabIndex={index === 0 ? 0 : -1}
      aria-label={name(pc, octave)}
      onPointerDown={(e) => e.button === 0 && press()}
      onPointerUp={() => pointerSource.release({ pc, octave })}
      onClick={(e) => e.detail === 0 && press()}
      style={
        {
          "--note": `var(--note-${pc})`,
          ...(black ? { left: `calc(${BLACK_OFFSET[pc] ?? 0} * (100% / 7) - (100% / 7) * 0.3)` } : {}),
        } as CSSProperties
      }
      className={cn(
        "flex items-end justify-center pb-2 text-xs font-semibold transition-colors",
        black
          ? "absolute top-0 z-10 h-[60%] w-[calc(100%/7*0.6)] rounded-b-md bg-neutral-900 text-neutral-100 dark:bg-neutral-950"
          : "relative h-full flex-1 rounded-b-lg border border-border bg-surface text-fg-muted",
        "after:absolute after:inset-x-1 after:bottom-1 after:h-1 after:rounded-full after:bg-(--note)",
        "data-[sounding=true]:bg-(--note) data-[sounding=true]:text-note-on",
      )}
    >
      <span aria-hidden className="mb-1.5">
        {name(pc)}
      </span>
    </button>
  );
}

/** An on-screen keyboard of one octave. Plays through the pointer input source. */
export function PianoKeys({ octave, className }: { octave?: number; className?: string }) {
  const globalOctave = useOctave();
  const t = useTranslations("notes");
  const o = octave ?? globalOctave;
  const ordered = [...PITCH_CLASSES.filter((pc) => !BLACK.has(pc)), ...PITCH_CLASSES.filter((pc) => BLACK.has(pc))];
  return (
    <div
      role="group"
      aria-label={t("octaveValue", { octave: o })}
      onKeyDown={(e) => rovingKeyDown(e)}
      className={cn("relative flex h-40 w-full max-w-xl touch-none gap-0.5 select-none", className)}
    >
      {ordered.map((pc, i) => (
        <Key key={pc} pc={pc} octave={o} index={i} />
      ))}
    </div>
  );
}
