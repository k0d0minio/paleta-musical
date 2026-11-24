"use client";

import { ListPlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRhythmPlayer } from "@/audio";
import { useAppStore } from "@/state";
import {
  PITCH_CLASSES,
  SCALE_IDS,
  STYLE_IDS,
  letterName,
  progressionName,
  progressionsOfStyle,
  resolveProgression,
  type ChordRef,
  type PitchClass,
  type StyleProgression,
} from "@/theory";
import { cn } from "@/ui/cn";
import { Button } from "@/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/components/dropdown-menu";
import { SegmentedControl } from "@/ui/components/toggle-group";
import { toast } from "@/ui/components/toaster";
import { ChordLabel, chordText } from "./chord-label";
import { inversionOptions, useInversionLabel } from "./chord-list";
import { ChordNotes } from "./chord-notes";
import { SelectField } from "./fields";
import { PlayButton } from "./play-button";
import { playChordRef, toggleRhythm } from "./play";
import { RhythmControls } from "./rhythm-controls";
import { rhythmOptions, setProgressions, useProgressionsState } from "./state";

type InversionMap = Readonly<Record<string, number>>;

/** Estilos (F070–F092): style progressions resolved in a key and scale. */
export function StylesTab() {
  const t = useTranslations("modules.progressions");
  const tScales = useTranslations("scales");
  const s = useProgressionsState();
  const [selected, setSelected] = useState<ChordRef | null>(null);
  // F073: per-chord inversions reset when the key, scale or style changes.
  const resetKey = `${s.key}|${s.scale}|${s.style}`;
  const [inv, setInv] = useState<{
    key: string;
    map: InversionMap;
    bulk: number;
  }>({
    key: resetKey,
    map: {},
    bulk: 0,
  });
  const current =
    inv.key === resetKey ? inv : { key: resetKey, map: {}, bulk: 0 };
  const list = progressionsOfStyle(s.style);
  const parent = resolveProgression(["I"], s.key, s.scale).parentScale;

  const setInversion = (id: string, k: number) =>
    setInv({ ...current, map: { ...current.map, [id]: k } });

  // U06: the bulk inversion applies to the chords of the listed style progressions.
  const setBulk = (k: number) => {
    const map: Record<string, number> = {};
    for (const p of list) {
      resolveProgression(p.numerals, s.key, s.scale).chords.forEach((c, i) => {
        const options = inversionOptions(c.chord).length;
        map[`${p.id}:${i}`] = Math.min(k, options - 1);
      });
    }
    setInv({ key: resetKey, map, bulk: k });
  };
  const inversionLabel = useInversionLabel();

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-fg-muted">{t("help.styles")}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <SelectField
          label={t("key")}
          value={String(s.key)}
          testId="styles-key"
          options={PITCH_CLASSES.map((pc) => ({
            value: String(pc),
            label: letterName(pc),
          }))}
          onChange={(v) => setProgressions({ key: Number(v) as PitchClass })}
        />
        <SelectField
          label={t("scale")}
          value={s.scale}
          testId="styles-scale"
          options={SCALE_IDS.map((id) => ({ value: id, label: tScales(id) }))}
          onChange={(scale) => setProgressions({ scale })}
        />
        <SelectField
          label={t("style")}
          value={s.style}
          testId="styles-style"
          options={STYLE_IDS.map((id) => ({
            value: id,
            label: t(`styles.${id}`),
          }))}
          onChange={(style) => setProgressions({ style })}
        />
      </div>
      {parent && (
        <p
          role="status"
          className="rounded-lg bg-warning-soft px-3 py-2 text-sm"
          data-testid="parent-scale"
        >
          {t("parentScale", {
            scale: tScales(s.scale),
            parent: tScales(parent),
          })}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,20rem)]">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
          <RhythmControls
            idPrefix="styles"
            rhythm={s.rhythm}
            bpm={s.bpm}
            onRhythm={(rhythm) => setProgressions({ rhythm })}
            onBpm={(bpm) => setProgressions({ bpm })}
          />
          <div className="flex flex-col gap-1">
            <span
              id="bulk-inversion"
              className="text-xs font-medium text-fg-muted"
            >
              {t("bulkInversion")}
            </span>
            <SegmentedControl
              aria-labelledby="bulk-inversion"
              value={String(current.bulk)}
              onValueChange={(v) => setBulk(Number(v))}
              options={[0, 1, 2, 3].map((k) => ({
                value: String(k),
                label: inversionLabel(k),
              }))}
            />
          </div>
        </div>
        <ChordNotes chord={selected} />
      </div>

      <section
        aria-labelledby="style-list-title"
        className="flex flex-col gap-3"
      >
        <h2 id="style-list-title" className="text-lg font-semibold">
          {t("progressionsOf", { style: t(`styles.${s.style}`) })}
        </h2>
        <ul
          className="grid gap-3 md:grid-cols-2"
          data-testid="style-progressions"
        >
          {list.map((p) => (
            <StyleCard
              key={p.id}
              progression={p}
              inversions={current.map}
              onInversion={setInversion}
              onSelect={setSelected}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function StyleCard({
  progression: p,
  inversions,
  onInversion,
  onSelect,
}: {
  progression: StyleProgression;
  inversions: InversionMap;
  onInversion: (id: string, k: number) => void;
  onSelect: (chord: ChordRef) => void;
}) {
  const t = useTranslations("modules.progressions");
  const inversionLabel = useInversionLabel();
  const s = useProgressionsState();
  const player = useRhythmPlayer();
  const append = useAppStore((st) => st.timelineActions.append);
  const source = `style:${p.id}`;
  const playing = player.source === source;
  const resolved = resolveProgression(p.numerals, s.key, s.scale).chords.map(
    (c, i) => ({
      ...c,
      chord: { ...c.chord, inversion: inversions[`${p.id}:${i}`] ?? 0 },
    }),
  );
  const name = p.nameKey ? t(p.nameKey) : progressionName(p);
  const chords = resolved.map((r) => r.chord);

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-1",
        playing && "ring-2 ring-accent",
      )}
      data-testid="style-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{name}</h3>
          <p className="text-sm text-fg-muted">
            {t(`descriptions.${p.id}` as "descriptions.pop1")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label={t("addToTimeline")}
            onClick={() => {
              // U08: valid chord types and the chosen inversions reach the timeline.
              append(
                resolved.map((r) => ({ chord: r.chord, tension: r.tension })),
              );
              toast.success(t("addedToTimeline", { count: resolved.length }));
            }}
          >
            <ListPlusIcon aria-hidden />
          </Button>
          <PlayButton
            playing={playing}
            playLabel={t("playProgression", { name })}
            stopLabel={t("stopProgression", { name })}
            onToggle={() =>
              toggleRhythm(
                source,
                playing,
                chords,
                s.rhythm,
                rhythmOptions(s, s.bpm),
              )
            }
          />
        </div>
      </div>
      <ol className="flex flex-wrap gap-1.5" aria-label={name}>
        {resolved.map((r, i) => {
          const sounding = playing && player.chordIndex === i;
          const text = chordText(r.chord);
          return (
            <li
              key={i}
              data-playing={sounding || undefined}
              className={cn(
                "relative flex items-stretch rounded-lg border border-border bg-surface",
                r.tension && "border-dashed border-tension",
                sounding && "ring-2 ring-accent",
              )}
            >
              {r.tension && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-lg hatch"
                />
              )}
              <button
                type="button"
                onClick={() => {
                  playChordRef(r.chord);
                  onSelect(r.chord);
                }}
                aria-current={sounding || undefined}
                className="relative flex min-h-11 flex-col items-start justify-center px-2.5 py-1 text-left hover:bg-surface-2"
              >
                <ChordLabel chord={r.chord} />
                <span className="text-xs text-fg-muted">
                  {r.numeral}
                  {r.tension && (
                    <span className="sr-only">, {t("tension")}</span>
                  )}
                </span>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={t("chooseInversion", { chord: text })}
                  className="relative grid w-7 place-items-center border-l border-border text-xs text-fg-muted hover:bg-surface-2"
                >
                  {r.chord.inversion > 0 ? r.chord.inversion : "·"}
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {inversionOptions(r.chord).map((o) => (
                    <DropdownMenuItem
                      key={o.inversion}
                      aria-current={o.inversion === r.chord.inversion}
                      className={cn(
                        "flex flex-col items-start gap-0 py-1",
                        o.inversion === r.chord.inversion && "font-semibold",
                      )}
                      onSelect={() => {
                        onInversion(`${p.id}:${i}`, o.inversion);
                        playChordRef(o.chord, 1.6);
                        onSelect(o.chord);
                      }}
                    >
                      <span>{inversionLabel(o.inversion)}</span>
                      <span className="text-xs text-fg-muted">{o.notes}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        })}
      </ol>
    </li>
  );
}
