"use client";

import type { CSSProperties } from "react";
import { audioEngine, NOTE_MARK_SECONDS } from "@/audio";
import { useOctave } from "@/state";
import { PITCH_CLASSES, type KeyContext, type PitchClass } from "@/theory";
import { cn } from "@/ui/cn";
import { rovingKeyDown } from "@/ui/roving";
import { useNoteText } from "./labels";

/**
 * The tonic choice (F028): a radio group of the 12 notes in their colours.
 * Arrow keys move and choose (radio pattern); choosing plays the note.
 */
export function TonicPicker({
  value,
  onChange,
  label,
  keyContext,
}: {
  value: PitchClass;
  onChange: (pc: PitchClass) => void;
  label: string;
  keyContext?: KeyContext;
}) {
  const octave = useOctave();
  const { letter, name } = useNoteText();
  const choose = (pc: PitchClass) => {
    onChange(pc);
    audioEngine.playNote({ pc, octave }, { markSeconds: NOTE_MARK_SECONDS });
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={(e) => {
        rovingKeyDown(e);
        const focused = document.activeElement as HTMLElement | null;
        const pc = Number(focused?.dataset.tonic);
        if (
          [
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "Home",
            "End",
          ].includes(e.key) &&
          Number.isInteger(pc)
        )
          choose(pc as PitchClass);
      }}
      className="grid grid-cols-6 gap-1.5 sm:grid-cols-12"
    >
      {PITCH_CLASSES.map((pc) => {
        const checked = pc === value;
        return (
          <button
            key={pc}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={name(pc, keyContext)}
            data-roving
            data-tonic={pc}
            tabIndex={checked ? 0 : -1}
            onClick={() => choose(pc)}
            style={{ "--note": `var(--note-${pc})` } as CSSProperties}
            className={cn(
              "relative flex h-11 min-w-11 items-center justify-center rounded-md border text-sm font-semibold transition-[background-color,box-shadow,color]",
              checked
                ? "border-transparent bg-(--note) text-note-on shadow-2"
                : "border-border bg-surface text-fg hover:bg-surface-2",
            )}
          >
            {!checked && (
              <span
                aria-hidden
                className="absolute top-1 left-1 size-2 rounded-full bg-(--note)"
              />
            )}
            <span aria-hidden>{letter(pc, keyContext)}</span>
          </button>
        );
      })}
    </div>
  );
}
