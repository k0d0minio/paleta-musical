"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  CHORD_TYPE_IDS,
  PITCH_CLASSES,
  substitutionsFor,
  type ChordRef,
  type ChordTypeId,
} from "@/theory";
import { cn } from "@/ui/cn";
import { Button } from "@/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/dialog";
import { NoteChip } from "@/ui/music";
import { ChordLabel, chordText } from "./chord-label";
import { inversionOptions, useInversionLabel } from "./chord-list";
import { SelectField } from "./fields";

/**
 * The chord editor (F145–F153): a Radix dialog that closes with Esc. New root
 * and type, the inversions of the one inversion model (U30) and the R12
 * substitutions. Every change replaces the chord, closes and plays it.
 */
export function ChordEditor({
  chord,
  onApply,
  onClose,
}: {
  chord: ChordRef | null;
  onApply: (chord: ChordRef) => void;
  onClose: () => void;
}) {
  const t = useTranslations("modules.progressions");
  return (
    <Dialog open={chord !== null} onOpenChange={(open) => !open && onClose()}>
      {chord && (
        <DialogContent closeLabel={t("editor.close")} className="gap-5">
          <EditorBody
            key={`${chord.root}-${chord.type}-${chord.inversion}`}
            chord={chord}
            onApply={onApply}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}

function EditorBody({
  chord,
  onApply,
}: {
  chord: ChordRef;
  onApply: (chord: ChordRef) => void;
}) {
  const t = useTranslations("modules.progressions");
  const tTypes = useTranslations("chordTypes");
  const inversionLabel = useInversionLabel();
  const [root, setRoot] = useState(chord.root);
  const [type, setType] = useState<ChordTypeId>(chord.type);
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("editor.title")}</DialogTitle>
        <DialogDescription>
          {t("editor.current", { chord: chordText(chord) })}
        </DialogDescription>
      </DialogHeader>

      <section className="flex flex-col gap-3" aria-labelledby="editor-root">
        <h3 id="editor-root" className="text-sm font-semibold">
          {t("editor.root")}
        </h3>
        <div className="grid grid-cols-6 gap-1.5">
          {PITCH_CLASSES.map((pc) => (
            <NoteChip
              key={pc}
              pc={pc}
              size="sm"
              selected={pc === root}
              onPress={setRoot}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <SelectField
            label={t("editor.type")}
            value={type}
            options={CHORD_TYPE_IDS.map((id) => ({
              value: id,
              label: tTypes(id),
            }))}
            onChange={setType}
            className="flex-1"
          />
          <Button
            variant="primary"
            onClick={() => onApply({ root, type, inversion: 0 })}
          >
            {t("editor.apply")}
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="editor-inv">
        <h3 id="editor-inv" className="text-sm font-semibold">
          {t("editor.inversions")}
        </h3>
        <ul className="grid grid-cols-2 gap-1.5">
          {inversionOptions(chord).map((o) => (
            <li key={o.inversion}>
              <button
                type="button"
                aria-current={o.inversion === chord.inversion || undefined}
                onClick={() => onApply(o.chord)}
                className={cn(
                  "flex min-h-11 w-full flex-col items-start rounded-md border border-border px-3 py-1.5 text-left text-sm hover:bg-surface-2",
                  o.inversion === chord.inversion &&
                    "border-fg bg-surface-2 font-semibold",
                )}
              >
                <span>{inversionLabel(o.inversion)}</span>
                <span className="text-xs text-fg-muted">{o.notes}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="editor-subs">
        <h3 id="editor-subs" className="text-sm font-semibold">
          {t("editor.substitutions")}
        </h3>
        <ul className="grid gap-1.5 sm:grid-cols-2" data-testid="substitutions">
          {substitutionsFor(chord).map((s) => (
            <li key={`${s.chord.root}-${s.chord.type}`}>
              <button
                type="button"
                onClick={() => onApply(s.chord)}
                className="flex min-h-11 w-full flex-col items-start rounded-md border border-border px-3 py-1.5 text-left hover:bg-surface-2"
              >
                <ChordLabel chord={s.chord} />
                <span className="text-xs text-fg-muted">
                  {t(`substitutions.${s.reason}` as "substitutions.sus4")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
