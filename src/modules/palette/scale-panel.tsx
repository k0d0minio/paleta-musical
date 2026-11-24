"use client";

import { CircleDotIcon, PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useGoTo } from "@/nav";
import { useAppStore } from "@/state";
import {
  PITCH_CLASSES,
  chordPitchClasses,
  diatonicChords,
  romanNumeral,
  scalePitchClasses,
  type KeyContext,
} from "@/theory";
import { Button } from "@/ui/components/button";
import { ChordName } from "@/ui/music";
import { useNoteText, useTheoryNames } from "./labels";
import { NoteDot, Panel, SubHeading } from "./panel";
import { SPACING, playChordRef, playSequence } from "./play";
import type { PaletteState } from "./state";

/** Escala mode panel (F039–F045). */
export function ScalePanel({
  state,
  tense,
  keyContext,
}: {
  state: PaletteState;
  /** Tension value above 0.45 (live, F043). */
  tense: boolean;
  keyContext: KeyContext;
}) {
  const t = useTranslations("modules.palette");
  const goTo = useGoTo();
  const { name, letter } = useNoteText();
  const names = useTheoryNames();
  const pcs = scalePitchClasses(state.tonic, state.scale);
  const outside = PITCH_CLASSES.filter((pc) => !pcs.includes(pc));
  const diatonic = diatonicChords(state.tonic, state.scale);

  return (
    <Panel
      labelledBy="palette-scale-title"
      title={
        <span className="inline-flex items-center gap-2">
          <NoteDot pc={state.tonic} />
          {t("scaleTitle", {
            tonic: letter(state.tonic, keyContext),
            scale: names.scale(state.scale),
          })}
        </span>
      }
      actions={
        <>
          <Button
            variant="primary"
            onClick={() => playSequence(pcs, SPACING.scale)}
          >
            <PlayIcon aria-hidden />
            {t("playScale")}
          </Button>
          <Button onClick={() => goTo("harmony")}>
            <CircleDotIcon aria-hidden />
            {t("openInHarmony")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-muted">
        {t("noteCount", { count: pcs.length })}
      </p>

      <div className="flex flex-col gap-2">
        <SubHeading id="palette-degrees">{t("degreesTitle")}</SubHeading>
        <ol
          aria-labelledby="palette-degrees"
          className="flex flex-wrap gap-x-4 gap-y-2"
        >
          {pcs.map((pc, i) => (
            <li key={pc} className="inline-flex items-center gap-1.5 text-sm">
              <span className="text-fg-muted tabular">{i + 1}.</span>
              <NoteDot pc={pc} />
              <span className="font-medium">{name(pc, keyContext)}</span>
            </li>
          ))}
        </ol>
      </div>

      {tense && outside.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg bg-tension-soft p-3">
          <SubHeading id="palette-tension-notes">
            {t("tensionNotesTitle")}
          </SubHeading>
          <ul
            aria-labelledby="palette-tension-notes"
            className="flex flex-wrap gap-x-4 gap-y-1"
          >
            {outside.map((pc) => (
              <li
                key={pc}
                className="inline-flex items-center gap-1.5 text-sm text-tension"
              >
                <NoteDot pc={pc} />
                {name(pc, keyContext)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {diatonic.length > 0 && (
        <div className="flex flex-col gap-2">
          <SubHeading id="palette-diatonic">{t("diatonicTitle")}</SubHeading>
          <ul
            aria-labelledby="palette-diatonic"
            className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
          >
            {diatonic.map((chord, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    playChordRef(chord);
                    useAppStore
                      .getState()
                      .setLastChord(
                        chordPitchClasses(chord.root, chord.type),
                        chord,
                      );
                  }}
                  aria-label={t("playDiatonic", {
                    roman: romanNumeral(i, chord.type),
                    chord: names.chordSymbol(
                      chord.root,
                      chord.type,
                      keyContext,
                    ),
                  })}
                  className="flex min-h-14 w-full flex-col items-center justify-center rounded-lg border border-border bg-surface-2 px-2 py-1.5 transition-colors hover:bg-border"
                >
                  <span className="text-xs font-semibold text-fg-muted">
                    {romanNumeral(i, chord.type)}
                  </span>
                  <ChordName chord={chord} keyContext={keyContext} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
