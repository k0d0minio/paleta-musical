"use client";

import { useTranslations } from "next-intl";
import { PITCH_CLASSES, type KeyContext, type PitchClass } from "@/theory";
import { cn } from "@/ui/cn";
import { NoteChip } from "@/ui/music";
import { rovingKeyDown } from "@/ui/roving";

export interface NoteMarks {
  /** Notes of the current set (scale or chord); others are dimmed. Null: no set, nothing dimmed. */
  readonly inSet: ReadonlySet<PitchClass> | null;
  /** Notes marked as tension (F038). */
  readonly tension: ReadonlySet<PitchClass>;
  /** Selected notes (Livre, Detetar, Acordes); null when the mode has no selection. */
  readonly selected: ReadonlySet<PitchClass> | null;
  /** Optional degree label under a note (1, ♭3, 5 …). */
  readonly degree?: (pc: PitchClass) => string | null;
}

/**
 * The note palette (F029): the 12 notes in their colours. One tab stop;
 * arrows move the focus, Enter or Space plays (and selects in the toggle
 * modes, through the input layer).
 */
export function NoteGrid({
  marks,
  keyContext,
  label,
}: {
  marks: NoteMarks;
  keyContext?: KeyContext;
  label: string;
}) {
  const t = useTranslations("modules.palette");
  return (
    <div
      role="toolbar"
      aria-label={label}
      onKeyDown={(e) => {
        const wide = window.matchMedia("(min-width: 64rem)").matches;
        const mid = window.matchMedia("(min-width: 40rem)").matches;
        rovingKeyDown(e, wide ? 12 : mid ? 6 : 4);
      }}
      className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3 lg:grid-cols-12"
    >
      {PITCH_CLASSES.map((pc) => {
        const tension = marks.tension.has(pc);
        // Outside the set: the note keeps its colour as a frame and stays
        // readable (no opacity, so the text keeps its contrast).
        const outside =
          marks.inSet !== null && !marks.inSet.has(pc) && !tension;
        const degree = marks.degree?.(pc) ?? null;
        return (
          <div key={pc} className="flex flex-col items-center gap-1">
            <NoteChip
              pc={pc}
              size="lg"
              className={cn(
                "w-full",
                outside &&
                  "bg-surface text-fg-muted shadow-none ring-2 ring-(--note) ring-inset",
              )}
              keyContext={keyContext}
              tabIndex={pc === 0 ? 0 : -1}
              tension={tension}
              selected={marks.selected ? marks.selected.has(pc) : undefined}
            />
            {marks.degree && (
              <span
                className="h-5 text-xs font-semibold text-fg-muted tabular"
                aria-hidden={degree === null}
              >
                {degree !== null && (
                  <>
                    <span className="sr-only">{t("degree")} </span>
                    {degree}
                  </>
                )}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
