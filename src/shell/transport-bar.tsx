"use client";

import { ListPlusIcon, RotateCcwIcon, SquareIcon, Volume2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { audioEngine, LAST_CHORD_MARK_SECONDS, useAudioStatus } from "@/audio";
import { useAppStore, useOctave, useSettings } from "@/state";
import { OCTAVE_MAX, OCTAVE_MIN, noteLabel, realizeChordInOctave } from "@/theory";
import { cn } from "@/ui/cn";
import { toast } from "@/ui/components/toaster";
import { Slider } from "@/ui/components/slider";
import { Tooltip } from "@/ui/components/tooltip";
import { ChordName, Stepper } from "@/ui/music";
import { useShellUi } from "./ui-store";

/** F023: the root first, the others within the octave above it, in the current octave, marked for 1.5 s. */
export function replayLastChord(): void {
  const { lastChord, octave } = useAppStore.getState().global;
  if (!lastChord) return;
  audioEngine.playChord(realizeChordInOctave(lastChord.pcs, octave), { markSeconds: LAST_CHORD_MARK_SECONDS });
}

function LastChord() {
  const t = useTranslations("transport");
  const lastChord = useAppStore((s) => s.global.lastChord);
  const append = useAppStore((s) => s.timelineActions.append);
  if (!lastChord) {
    return <span className="hidden text-sm text-fg-subtle sm:inline">{t("noLastChord")}</span>;
  }
  const chord = lastChord.chord;
  return (
    <div role="group" aria-label={t("lastChord")} className="flex min-w-0 items-center gap-1">
      <span className="hidden text-xs font-medium text-fg-muted lg:inline">{t("lastChord")}</span>
      <span className="flex min-w-0 items-center gap-1 rounded-lg bg-surface-2 px-2 py-1" data-testid="last-chord">
        {chord && <ChordName chord={chord} className="mr-1" />}
        {/* F022: the notes of the last chord, with sharp names. */}
        <span className="truncate text-xs text-fg-muted">
          {lastChord.pcs.map((pc) => noteLabel(pc, "sharps").letter).join(" · ")}
        </span>
      </span>
      <Tooltip content={t("replay")}>
        <button
          type="button"
          aria-label={t("replay")}
          onClick={replayLastChord}
          className="grid size-11 place-items-center rounded-lg hover:bg-surface-2"
        >
          <RotateCcwIcon className="size-4" aria-hidden />
        </button>
      </Tooltip>
      {chord && (
        <Tooltip content={t("addToTimeline")}>
          <button
            type="button"
            aria-label={t("addToTimeline")}
            onClick={() => {
              append([{ chord }]);
              toast.success(t("addedToTimeline"));
            }}
            className="hidden size-11 place-items-center rounded-lg hover:bg-surface-2 sm:grid"
          >
            <ListPlusIcon className="size-4" aria-hidden />
          </button>
        </Tooltip>
      )}
    </div>
  );
}

/** The global transport bar: octave, last chord, stop-all, master volume and instrument. */
export function TransportBar() {
  const t = useTranslations();
  const octave = useOctave();
  const setOctave = useAppStore((s) => s.setOctave);
  const settings = useSettings();
  const updateSettings = useAppStore((s) => s.updateSettings);
  const status = useAudioStatus();
  const ui = useShellUi();

  return (
    <section
      aria-label={t("transport.label")}
      className="flex items-center gap-2 border-t border-border bg-surface/95 px-2 py-1 backdrop-blur sm:gap-4 sm:px-4"
    >
      <Stepper
        label={t("transport.octave")}
        value={octave}
        min={OCTAVE_MIN}
        max={OCTAVE_MAX}
        onChange={setOctave}
        className="shrink-0"
      />
      <div className="h-8 w-px shrink-0 bg-border" aria-hidden />
      <div className="min-w-0 flex-1">
        <LastChord />
      </div>
      <span className="sr-only" aria-live="polite">
        {status.playing ? t("transport.playing") : ""}
      </span>
      <Tooltip content={`${t("transport.stopAll")} (Esc)`}>
        <button
          type="button"
          onClick={() => audioEngine.stopAll()}
          aria-label={t("transport.stopAll")}
          className={cn(
            "flex h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
            status.playing ? "bg-accent text-accent-fg" : "text-fg-muted hover:bg-surface-2",
          )}
        >
          <SquareIcon className={cn("size-3.5", status.playing && "fill-current")} aria-hidden />
          <span className="hidden sm:inline">{t("transport.stopAll")}</span>
        </button>
      </Tooltip>
      <div className="hidden w-40 shrink-0 items-center gap-2 lg:flex">
        <Volume2Icon className="size-4 text-fg-muted" aria-hidden />
        <Slider
          aria-label={t("transport.volume")}
          value={[Math.round(settings.volume * 100)]}
          max={100}
          step={1}
          onValueChange={([v]) => updateSettings({ volume: (v ?? 80) / 100 })}
        />
      </div>
      <button
        type="button"
        onClick={() => ui.set({ settingsOpen: true })}
        className="hidden h-11 shrink-0 items-center rounded-lg px-3 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg xl:flex"
        aria-label={`${t("transport.instrument")}: ${t(`instruments.${settings.instrument}` as "instruments.triangle")}`}
      >
        {t(`instruments.${settings.instrument}` as "instruments.triangle")}
      </button>
    </section>
  );
}
