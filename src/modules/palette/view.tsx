"use client";

import { useTranslations } from "next-intl";
import { audioEngine, NOTE_MARK_SECONDS } from "@/audio";
import { useInputNotes } from "@/input";
import { PITCH_CLASSES } from "@/theory";
import { Kbd } from "@/ui/components/kbd";
import { ModulePage } from "@/ui/module-page";
import { NoteChip } from "@/ui/music";
import { rovingKeyDown } from "@/ui/roving";

/**
 * The vertical slice (JAM-547): the 12 notes in their colours. A tap or a
 * QWERTY key goes through the input layer, plays the note in the global
 * octave and marks it as sounding for 0.7 s (F031). Ticket 2 replaces the
 * row with the full palette.
 */
export function PaletteView() {
  const t = useTranslations("modules.palette");

  useInputNotes({
    noteOn: ({ note }) =>
      audioEngine.playNote(note, { markSeconds: NOTE_MARK_SECONDS }),
  });

  return (
    <ModulePage title={t("title")} description={t("description")}>
      <div
        role="toolbar"
        aria-label={t("notesLabel")}
        onKeyDown={(e) => rovingKeyDown(e, 6)}
        className="grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3 lg:grid-cols-12"
      >
        {PITCH_CLASSES.map((pc) => (
          <NoteChip key={pc} pc={pc} size="lg" tabIndex={pc === 0 ? 0 : -1} />
        ))}
      </div>
      <p className="hidden text-sm text-fg-muted sm:block">
        {t.rich("keyboardHint", {
          keys: () => (
            <span className="inline-flex flex-wrap gap-0.5 align-middle">
              {[
                "A",
                "W",
                "S",
                "E",
                "D",
                "F",
                "T",
                "G",
                "Y",
                "H",
                "U",
                "J",
                "K",
              ].map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          ),
          down: () => <Kbd>Z</Kbd>,
          up: () => <Kbd>X</Kbd>,
        })}
      </p>
      <p className="rounded-xl border border-dashed border-border-strong bg-surface/60 p-4 text-sm text-fg-muted">
        <strong className="font-semibold text-fg">{t("emptyTitle")}.</strong>{" "}
        {t("emptyBody")}
      </p>
    </ModulePage>
  );
}
