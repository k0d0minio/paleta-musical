"use client";

import {
  memo,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { useTranslations } from "next-intl";
import { useSounding } from "@/audio";
import { pointerSource } from "@/input/sources/pointer";
import { useOctave } from "@/state";
import type { KeyContext, PitchClass } from "@/theory";
import { cn } from "../cn";
import { NoteName } from "./note-name";

export interface NoteChipProps {
  pc: PitchClass;
  /** Octave of the note this chip plays. Defaults to the global octave. */
  octave?: number;
  /** Selected state (toggle modes). Sets aria-pressed. */
  selected?: boolean;
  /** Shown as a tension note (pattern + label, not only colour). */
  tension?: boolean;
  /** Muted: the note is outside the current set. */
  dimmed?: boolean;
  size?: "sm" | "md" | "lg";
  /** Spells the name in this key when the spelling setting is "key". */
  keyContext?: KeyContext;
  /** Plays through the pointer input source (default true). */
  playsNote?: boolean;
  onPress?: (pc: PitchClass) => void;
  tabIndex?: number;
  className?: string;
  /** Test seam: counts renders. */
  onRender?: (pc: PitchClass) => void;
}

/**
 * One note: its identity colour (F276), its name (never colour alone, WCAG
 * 1.4.1) and its sounding state (F011). It subscribes to its own pitch class
 * on the sounding bus, so a mark re-renders this chip only.
 */
export const NoteChip = memo(function NoteChip({
  pc,
  octave,
  selected,
  tension = false,
  dimmed = false,
  size = "md",
  keyContext,
  playsNote = true,
  onPress,
  tabIndex,
  className,
  onRender,
}: NoteChipProps) {
  onRender?.(pc);
  const sounding = useSounding(pc);
  const globalOctave = useOctave();
  const t = useTranslations("notes");

  const trigger = () => {
    if (playsNote) pointerSource.press({ pc, octave: octave ?? globalOctave });
    onPress?.(pc);
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    trigger();
  };
  // Keyboard activation (Enter / Space) arrives as a click with detail 0.
  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) trigger();
  };

  const extra = [tension && t("tension"), sounding && t("sounding")]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      data-roving
      data-pc={pc}
      data-sounding={sounding}
      data-tension={tension || undefined}
      aria-pressed={selected}
      tabIndex={tabIndex}
      onPointerDown={onPointerDown}
      onClick={onClick}
      style={{ "--note": `var(--note-${pc})` } as CSSProperties}
      className={cn(
        "relative isolate flex flex-col items-center justify-center rounded-xl font-semibold text-note-on select-none",
        "bg-(--note) shadow-1 transition-[transform,opacity,box-shadow] duration-(--duration-fast) ease-(--ease-out) active:scale-95",
        size === "sm" && "min-h-11 min-w-11 px-2 text-sm",
        size === "md" && "min-h-16 min-w-14 px-2 text-base",
        size === "lg" && "min-h-24 min-w-16 px-3 text-lg sm:min-h-28",
        dimmed && "opacity-40",
        selected && "ring-2 ring-fg ring-offset-2 ring-offset-bg",
        tension && "outline-2 outline-offset-2 outline-tension outline-dashed",
        className,
      )}
    >
      <NoteName
        pc={pc}
        stacked
        keyContext={keyContext}
        className="leading-tight"
      />
      {extra && <span className="sr-only"> ({extra})</span>}
      {tension && (
        <span aria-hidden className="absolute inset-0 -z-10 rounded-xl hatch" />
      )}
    </button>
  );
});
