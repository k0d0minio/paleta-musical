"use client";

import {
  DownloadIcon,
  Redo2Icon,
  RepeatIcon,
  Trash2Icon,
  Undo2Icon,
  UploadIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { getRhythmPlayerState, stopRhythm, useRhythmPlayer } from "@/audio";
import { useAppStore, useUndoRedo, type ProgressionItem } from "@/state";
import { Button } from "@/ui/components/button";
import { toast } from "@/ui/components/toaster";
import { ChordEditor } from "./chord-editor";
import { ChordList } from "./chord-list";
import { exportProgressionMidi, readMidiChords } from "./midi-actions";
import { PlayButton } from "./play-button";
import { itemsToChords, playChordRef, toggleRhythm } from "./play";
import { RhythmControls } from "./rhythm-controls";
import {
  parseProgressionsState,
  rhythmOptions,
  setProgressions,
  useProgressionsState,
  useTimelineItems,
} from "./state";

export const TIMELINE_SOURCE = "timeline";

/** Toggles timeline playback (Space shortcut and the play button). */
export function toggleTimeline(): void {
  const { timeline, modules } = useAppStore.getState();
  if (timeline.items.length === 0) return;
  const s = parseProgressionsState(modules.progressions);
  const playing = getRhythmPlayerState().source === TIMELINE_SOURCE;
  toggleRhythm(
    TIMELINE_SOURCE,
    playing,
    itemsToChords(timeline.items),
    s.timelineRhythm,
    rhythmOptions(s, s.timelineBpm),
    s.timelineLoop,
  );
}

/** One undo/redo pair for the chord lists (zundo; Ctrl+Z / Ctrl+Shift+Z work everywhere). */
export function UndoRedo() {
  const t = useTranslations("modules.progressions.list");
  const { canUndo, canRedo, undo, redo } = useUndoRedo();
  return (
    <div className="flex gap-1">
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={t("undo")}
        disabled={!canUndo}
        onClick={undo}
      >
        <Undo2Icon aria-hidden />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={t("redo")}
        disabled={!canRedo}
        onClick={redo}
      >
        <Redo2Icon aria-hidden />
      </Button>
    </div>
  );
}

/** The shared timeline (F131–F142), in both sub-modules. */
export function Timeline() {
  const t = useTranslations("modules.progressions");
  const items = useTimelineItems();
  const actions = useAppStore((s) => s.timelineActions);
  const s = useProgressionsState();
  const player = useRhythmPlayer();
  const playing = player.source === TIMELINE_SOURCE;
  const [editing, setEditing] = useState<ProgressionItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { chords, skipped } = await readMidiChords(file);
      if (chords.length === 0) {
        toast.error(t("timeline.importNone"));
        return;
      }
      actions.append(chords.map((chord) => ({ chord })));
      toast.success(t("timeline.imported", { count: chords.length }), {
        description:
          skipped > 0
            ? t("timeline.importSkipped", { count: skipped })
            : undefined,
      });
    } catch {
      toast.error(t("timeline.importFailed"));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <section
      aria-labelledby="timeline-title"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-sunken p-4"
      data-testid="timeline"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="timeline-title" className="text-lg font-semibold">
          {t("timeline.title")}
          {items.length > 0 && (
            <span className="ml-2 text-sm font-normal text-fg-muted tabular">
              ({items.length})
            </span>
          )}
        </h2>
        <div className="flex flex-wrap items-center gap-1">
          <UndoRedo />
          <input
            ref={fileRef}
            type="file"
            accept=".mid,.midi,audio/midi,audio/x-midi"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            data-testid="midi-import"
            onChange={(e) => void onImport(e.target.files?.[0])}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fileRef.current?.click()}
          >
            <UploadIcon aria-hidden />
            {t("timeline.import")}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-fg-muted">{t("timeline.empty")}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex items-center gap-2 pt-5">
              <PlayButton
                playing={playing}
                onToggle={toggleTimeline}
                playLabel={t("playProgression", { name: t("timeline.title") })}
                stopLabel={t("stopProgression", { name: t("timeline.title") })}
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label={t("timeline.loop")}
                aria-pressed={s.timelineLoop}
                onClick={() =>
                  setProgressions({ timelineLoop: !s.timelineLoop })
                }
                className="aria-pressed:bg-surface-2 aria-pressed:text-fg"
              >
                <RepeatIcon aria-hidden />
              </Button>
            </div>
            <RhythmControls
              idPrefix="timeline"
              rhythm={s.timelineRhythm}
              bpm={s.timelineBpm}
              onRhythm={(r) => setProgressions({ timelineRhythm: r })}
              onBpm={(b) => setProgressions({ timelineBpm: b })}
            />
          </div>
          <ChordList
            items={items}
            actions={actions}
            source={TIMELINE_SOURCE}
            label={t("timeline.title")}
            onEdit={setEditing}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                void exportProgressionMidi(
                  itemsToChords(items),
                  s.timelineRhythm,
                  rhythmOptions(s, s.timelineBpm),
                ).then(
                  ({ fileName }) =>
                    toast.success(t("midi.exported", { file: fileName })),
                  () => toast.error(t("midi.failed")),
                );
              }}
            >
              <DownloadIcon aria-hidden />
              {t("midi.export")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                stopRhythm(TIMELINE_SOURCE);
                actions.clear();
              }}
            >
              <Trash2Icon aria-hidden />
              {t("timeline.clear")}
            </Button>
          </div>
        </>
      )}
      <ChordEditor
        chord={editing?.chord ?? null}
        onClose={() => setEditing(null)}
        onApply={(chord) => {
          if (editing) actions.replace(editing.id, chord);
          setEditing(null);
          playChordRef(chord);
        }}
      />
    </section>
  );
}
