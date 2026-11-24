"use client";

import { PianoIcon, PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useGoTo } from "@/nav";
import {
  alterationSymbol,
  alterationsFor,
  chordPitchClasses,
  getChordType,
  invertIntervals,
  inversionCount,
  toPitchClass,
  type KeyContext,
} from "@/theory";
import { Button } from "@/ui/components/button";
import { ChordName, NoteChip } from "@/ui/music";
import { rovingKeyDown } from "@/ui/roving";
import { useNoteText, useTheoryNames } from "./labels";
import { Panel, SubHeading } from "./panel";
import { playChordRef, playIntervals } from "./play";
import type { PaletteState } from "./state";

/** Acorde mode panel (F048–F055). */
export function ChordPanel({
  state,
  tense,
  keyContext,
}: {
  state: PaletteState;
  /** Tension value above 0.45 (live, F054). */
  tense: boolean;
  keyContext: KeyContext;
}) {
  const t = useTranslations("modules.palette");
  const goTo = useGoTo();
  const { letter } = useNoteText();
  const names = useTheoryNames();
  const { tonic, chordType } = state;
  const chord = { root: tonic, type: chordType, inversion: 0 };
  const pcs = chordPitchClasses(tonic, chordType);
  const intervals = getChordType(chordType).intervals;
  const inversions = inversionCount(intervals);
  const altered = tense ? alterationsFor(chordType) : [];
  const symbol = names.chordSymbol(tonic, chordType, keyContext);

  return (
    <Panel
      labelledBy="palette-chord-title"
      title={
        <span className="inline-flex items-baseline gap-2">
          <ChordName
            chord={chord}
            keyContext={keyContext}
            className="text-xl"
          />
          <span className="text-sm font-normal text-fg-muted">
            {names.chordType(chordType)}
          </span>
        </span>
      }
      actions={
        <>
          <Button variant="primary" onClick={() => playChordRef(chord)}>
            <PlayIcon aria-hidden />
            {t("playChord")}
          </Button>
          <Button onClick={() => goTo("chords", { notes: pcs.join(",") })}>
            <PianoIcon aria-hidden />
            {t("openInChords")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-muted">
        {t("noteCount", { count: pcs.length })}
      </p>

      <div className="flex flex-col gap-2">
        <SubHeading id="palette-chord-notes">{t("chordNotesTitle")}</SubHeading>
        <div
          role="group"
          aria-labelledby="palette-chord-notes"
          onKeyDown={(e) => rovingKeyDown(e)}
          className="flex flex-wrap gap-2"
        >
          {pcs.map((pc, i) => (
            <NoteChip
              key={pc}
              pc={pc}
              size="md"
              keyContext={keyContext}
              tabIndex={i === 0 ? 0 : -1}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <SubHeading id="palette-inversions">{t("inversionsTitle")}</SubHeading>
        <ul
          aria-labelledby="palette-inversions"
          className="grid gap-2 sm:grid-cols-2"
        >
          {Array.from({ length: inversions }, (_, k) => {
            const voiced = invertIntervals(intervals, k).map((iv) =>
              toPitchClass(tonic + iv),
            );
            return (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => playChordRef({ ...chord, inversion: k })}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2 text-left text-sm transition-colors hover:bg-border"
                >
                  <span className="font-medium">
                    {k === 0 ? t("rootPosition") : t("inversion", { n: k })}
                  </span>
                  <span className="text-fg-muted">
                    {voiced.map((pc) => letter(pc, keyContext)).join(" · ")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {altered.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg bg-tension-soft p-3">
          <SubHeading id="palette-altered">{t("alteredTitle")}</SubHeading>
          <ul
            aria-labelledby="palette-altered"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            {altered.map(({ alteration, intervals: ivs }) => (
              <li key={alteration}>
                <button
                  type="button"
                  data-tension
                  onClick={() => playIntervals(tonic, ivs)}
                  className="flex min-h-11 w-full flex-col items-center justify-center rounded-lg border border-dashed border-tension bg-surface px-2 py-1.5 text-sm font-semibold text-tension"
                >
                  <span>
                    {symbol}({alterationSymbol(alteration)})
                  </span>
                  <span className="text-xs font-normal">
                    {ivs
                      .map((iv) => letter(toPitchClass(tonic + iv), keyContext))
                      .join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
