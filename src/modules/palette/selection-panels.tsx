"use client";

import { EyeIcon, PlayIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  compatibleScales,
  partialScales,
  type PitchClass,
  type ScaleMatch,
} from "@/theory";
import { Button } from "@/ui/components/button";
import { useNoteText, useTheoryNames } from "./labels";
import { NoteDot, Panel, SubHeading } from "./panel";
import { SPACING, playSequence } from "./play";
import { setPalette } from "./state";

function SelectedNotes({
  notes,
  labelledBy,
}: {
  notes: readonly PitchClass[];
  labelledBy: string;
}) {
  const { name } = useNoteText();
  return (
    <ol aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
      {notes.map((pc) => (
        <li
          key={pc}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-sm font-medium"
        >
          <NoteDot pc={pc} />
          {name(pc)}
        </li>
      ))}
    </ol>
  );
}

/** "<root> <scale>": the root in its colour. */
function ScaleLabel({ match }: { match: ScaleMatch }) {
  const { letter } = useNoteText();
  const names = useTheoryNames();
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold">
      <NoteDot pc={match.root} />
      {letter(match.root)} {names.scale(match.scale)}
    </span>
  );
}

/** Livre mode panel (F057–F060). */
export function FreePanel({ notes }: { notes: readonly PitchClass[] }) {
  const t = useTranslations("modules.palette");
  const scales = compatibleScales(notes, 3);
  return (
    <Panel
      labelledBy="palette-free-title"
      title={t("freeTitle")}
      actions={
        notes.length > 0 && (
          <>
            <Button
              variant="primary"
              onClick={() => playSequence(notes, SPACING.free)}
            >
              <PlayIcon aria-hidden />
              {t("playSelection")}
            </Button>
            <Button onClick={() => setPalette({ freeNotes: [] })}>
              <XIcon aria-hidden />
              {t("clear")}
            </Button>
          </>
        )
      }
    >
      {notes.length === 0 ? (
        <p className="text-sm text-fg-muted">{t("freeEmpty")}</p>
      ) : (
        <>
          <SelectedNotes notes={notes} labelledBy="palette-free-title" />
          <div className="flex flex-col gap-2" aria-live="polite">
            <SubHeading id="palette-free-scales">
              {t("commonScalesTitle")}
            </SubHeading>
            {scales.length === 0 ? (
              <p className="text-sm text-fg-muted">{t("noCommonScale")}</p>
            ) : (
              <ul
                aria-labelledby="palette-free-scales"
                className="flex flex-wrap gap-x-5 gap-y-1"
              >
                {scales.map((m) => (
                  <li key={`${m.root}-${m.scale}`}>
                    <ScaleLabel match={m} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}

function ScaleResult({ match }: { match: ScaleMatch }) {
  const t = useTranslations("modules.palette");
  const { letter } = useNoteText();
  const names = useTheoryNames();
  const partial = match.matched < match.total;
  const title = `${letter(match.root)} ${names.scale(match.scale)}`;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="inline-flex items-center gap-2">
          <ScaleLabel match={match} />
          {partial && (
            <span className="text-sm text-fg-muted tabular">
              ({match.matched}/{match.total})
            </span>
          )}
        </span>
        <span className="text-sm text-fg-muted">
          {match.pcs.map((pc) => letter(pc)).join(" · ")}
        </span>
      </div>
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          aria-label={t("playScaleNamed", { scale: title })}
          onClick={() => playSequence(match.pcs, SPACING.detect)}
        >
          <PlayIcon aria-hidden />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={t("showScaleNamed", { scale: title })}
          onClick={() =>
            setPalette({ mode: "scale", tonic: match.root, scale: match.scale })
          }
        >
          <EyeIcon aria-hidden />
        </Button>
      </div>
    </li>
  );
}

/** Detetar mode panel (F062–F067). */
export function DetectPanel({ notes }: { notes: readonly PitchClass[] }) {
  const t = useTranslations("modules.palette");
  const compatible = compatibleScales(notes, 8);
  const partial = partialScales(notes, 6);
  return (
    <Panel
      labelledBy="palette-detect-title"
      title={t("detectTitle")}
      actions={
        notes.length > 0 && (
          <Button onClick={() => setPalette({ detectNotes: [] })}>
            <XIcon aria-hidden />
            {t("clear")}
          </Button>
        )
      }
    >
      {notes.length === 0 ? (
        <div className="flex flex-col gap-1">
          <p className="font-medium">{t("detectInstruction")}</p>
          <p className="text-sm text-fg-muted">{t("detectHint")}</p>
        </div>
      ) : (
        <>
          <SelectedNotes notes={notes} labelledBy="palette-detect-title" />
          <div className="flex flex-col gap-4" aria-live="polite">
            {compatible.length === 0 && partial.length === 0 ? (
              <p className="text-sm text-fg-muted">{t("noScaleFound")}</p>
            ) : (
              <>
                {compatible.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <SubHeading id="palette-compatible">
                      {t("compatibleTitle", { count: compatible.length })}
                    </SubHeading>
                    <ul
                      aria-labelledby="palette-compatible"
                      className="grid gap-2 lg:grid-cols-2"
                    >
                      {compatible.map((m) => (
                        <ScaleResult key={`${m.root}-${m.scale}`} match={m} />
                      ))}
                    </ul>
                  </div>
                )}
                {partial.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <SubHeading id="palette-partial">
                      {t("partialTitle", { count: partial.length })}
                    </SubHeading>
                    <ul
                      aria-labelledby="palette-partial"
                      className="grid gap-2 lg:grid-cols-2"
                    >
                      {partial.map((m) => (
                        <ScaleResult key={`${m.root}-${m.scale}`} match={m} />
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </Panel>
  );
}
