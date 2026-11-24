"use client";

import { useTranslations } from "next-intl";
import {
  ARPEGGIO_RHYTHMS,
  RHYTHM_IDS,
  autoArpNoteMs,
  type RhythmId,
} from "@/theory";
import { BpmField } from "@/ui/music";
import { RangeField, SelectField } from "./fields";
import { setProgressions, useProgressionsState } from "./state";

/**
 * Rhythm (R9) and BPM of one playback list, plus the rhythm settings that
 * apply to it: swing (F077), strum speed (F078), repeats (F079) and the
 * arpeggio note speed (F080, U05). Those settings are shared (F134).
 */
export function RhythmControls({
  rhythm,
  bpm,
  onRhythm,
  onBpm,
  idPrefix,
}: {
  rhythm: RhythmId;
  bpm: number;
  onRhythm: (r: RhythmId) => void;
  onBpm: (bpm: number) => void;
  idPrefix: string;
}) {
  const t = useTranslations("modules.progressions");
  const s = useProgressionsState();
  const arpeggio = ARPEGGIO_RHYTHMS.includes(rhythm);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <SelectField
          label={t("rhythm")}
          value={rhythm}
          testId={`${idPrefix}-rhythm`}
          options={RHYTHM_IDS.map((id) => ({
            value: id,
            label: t(`rhythms.${id}.name`),
          }))}
          onChange={onRhythm}
          className="w-44"
        />
        <BpmField value={bpm} onChange={onBpm} />
      </div>
      <p className="text-xs text-fg-muted">
        {t(`rhythms.${rhythm}.description`)}
      </p>
      {rhythm === "swing" && (
        <RangeField
          label={t("swing")}
          value={Math.round(s.swing * 100)}
          min={50}
          max={75}
          step={1}
          format={(v) => t("percent", { value: v })}
          onChange={(v) => setProgressions({ swing: v / 100 })}
        />
      )}
      {rhythm === "strum" && (
        <RangeField
          label={t("strumSpeed")}
          value={s.strumMs}
          min={10}
          max={120}
          step={5}
          format={(v) => t("ms", { value: v })}
          onChange={(v) => setProgressions({ strumMs: v })}
        />
      )}
      {rhythm === "loop" && (
        <RangeField
          label={t("repeats")}
          value={s.repeats}
          min={1}
          max={8}
          step={1}
          format={(v) => `×${v}`}
          onChange={(v) => setProgressions({ repeats: v })}
        />
      )}
      {arpeggio && (
        <RangeField
          label={t("arpSpeed")}
          value={s.arpNoteMs ?? Math.min(200, autoArpNoteMs(bpm))}
          min={30}
          max={200}
          step={5}
          disabled={s.arpNoteMs === null}
          format={(v) =>
            s.arpNoteMs === null
              ? t("ms", { value: autoArpNoteMs(bpm) })
              : t("ms", { value: v })
          }
          onChange={(v) => setProgressions({ arpNoteMs: v })}
        >
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-(--fg)"
              checked={s.arpNoteMs === null}
              onChange={(e) =>
                setProgressions({
                  arpNoteMs: e.target.checked
                    ? null
                    : Math.min(200, Math.max(30, autoArpNoteMs(bpm))),
                })
              }
            />
            {t("arpFollowBpm")}
          </label>
          <p className="text-xs text-fg-muted">{t("arpHint")}</p>
        </RangeField>
      )}
    </div>
  );
}
