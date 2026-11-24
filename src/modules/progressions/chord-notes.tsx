"use client";

import { useTranslations } from "next-intl";
import { useAppStore } from "@/state";
import { voiceChord, type ChordRef } from "@/theory";
import { NoteChip } from "@/ui/music";
import { ChordLabel } from "./chord-label";

/**
 * A chord-notes display (F074, F125): the notes of a chord in their colours.
 * Sounding notes are marked by the sounding bus. Defaults to the last chord.
 */
export function ChordNotes({ chord }: { chord?: ChordRef | null }) {
  const t = useTranslations("modules.progressions");
  const lastChord = useAppStore((s) => s.global.lastChord);
  const octave = useAppStore((s) => s.global.octave);
  const shown = chord === undefined ? (lastChord?.chord ?? null) : chord;
  const pcs = shown
    ? voiceChord(shown, octave).map((n) => n.pc)
    : (lastChord?.pcs ?? []);
  return (
    <section
      aria-labelledby="chord-notes-title"
      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="chord-notes-title" className="text-sm font-semibold">
          {t("chordNotes")}
        </h2>
        {shown && <ChordLabel chord={shown} />}
      </div>
      {pcs.length === 0 ? (
        <p className="text-sm text-fg-muted">{t("noChordYet")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2" data-testid="chord-notes">
          {pcs.map((pc, i) => (
            <li key={`${pc}-${i}`}>
              <NoteChip pc={pc} size="sm" tabIndex={-1} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
