"use client";

import {
  ArrowLeftIcon,
  DownloadIcon,
  EraserIcon,
  FlameIcon,
  KeyboardIcon,
  ListXIcon,
  MagnetIcon,
  Maximize2Icon,
  MousePointer2Icon,
  PaletteIcon,
  PencilIcon,
  Redo2Icon,
  RepeatIcon,
  SkipBackIcon,
  Trash2Icon,
  Undo2Icon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { useGoTo } from "@/nav";
import { useSettings, useUndoRedo } from "@/state";
import { letterName, toPitchClass, type PitchClass } from "@/theory";
import { Button } from "@/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/ui/components/popover";
import { Slider } from "@/ui/components/slider";
import { toast } from "@/ui/components/toaster";
import { SegmentedControl, ToggleGroup } from "@/ui/components/toggle-group";
import { Tooltip } from "@/ui/components/tooltip";
import { ModulePage } from "@/ui/module-page";
import { Stepper, TransportButton } from "@/ui/music";
import { cn } from "@/ui/cn";
import { RollCanvas } from "./canvas/roll-canvas";
import { TimeScrollbar } from "./parts/scrollbar";
import { SourcePanel } from "./parts/source-panel";
import {
  exportMidi,
  home,
  play,
  registerStopAll,
  setLoop,
  stopEverything,
  stopMic,
  stopPlayback,
  viewOrFit,
} from "./engine/controller";
import { session, useRollSession } from "./engine/session";
import {
  distinctPitchClasses,
  notesOfPitchClass,
  pitchClassSummary,
  quantize,
  removeNotes,
  setVelocity,
} from "./lib/edit";
import { fitView, zoomIn, zoomOut } from "./lib/geometry";
import {
  BPM_MAX,
  BPM_MIN,
  BPM_STEP,
  GRIDS,
  clampBpm,
  type Grid,
  type PlayMode,
  type RollNote,
  type Tool,
} from "./lib/model";
import {
  setRollDoc,
  setRollSettings,
  useRollDoc,
  useRollSettings,
} from "./state";

const GRID_KEYS: Record<Grid, "q4" | "q8" | "q16" | "q32" | "t8" | "t16"> = {
  "1/4": "q4",
  "1/8": "q8",
  "1/16": "q16",
  "1/32": "q32",
  "1/8t": "t8",
  "1/16t": "t16",
};

const TOOL_ICONS: Record<Tool, typeof MousePointer2Icon> = {
  select: MousePointer2Icon,
  draw: PencilIcon,
  erase: EraserIcon,
};

const fmt = (seconds: number) => seconds.toFixed(2);

/** The piano roll (/analyse/roll): F226–F264, U17–U22. */
export function PianoRollView() {
  const t = useTranslations("modules.analyse");
  const tr = useTranslations("modules.analyse.roll");
  const goTo = useGoTo();
  const doc = useRollDoc();
  const settings = useRollSettings();
  const appSettings = useSettings();
  const view = useRollSession((s) => s.view);
  const selection = useRollSession((s) => s.selection);
  const playing = useRollSession((s) => s.transport.playing);
  const loop = useRollSession((s) => s.loop);
  const busy = useRollSession((s) => s.busy);
  const undoRedo = useUndoRedo();
  const helpId = useId();
  const canvasId = useId();
  const [announcement, setAnnouncement] = useState("");

  const letters = Array.from({ length: 12 }, (_, pc) =>
    letterName(pc as PitchClass, appSettings.spelling),
  );
  const visible = viewOrFit(view, doc.duration);

  // U17: leaving the roll (unmount) or the module (stop-all) stops the
  // microphone and playback; so does the page going to the background (iOS).
  useEffect(() => {
    const off = registerStopAll();
    const onVisibility = () => {
      if (document.hidden && session.get().capture) void stopMic();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      off();
      document.removeEventListener("visibilitychange", onVisibility);
      void stopEverything();
    };
  }, []);

  const describeNote = useCallback(
    (n: RollNote) =>
      tr("announce.note", {
        name: `${letters[n.midi % 12]}${Math.floor(n.midi / 12) - 1}`,
        start: fmt(n.start),
        length: fmt(n.duration),
        velocity: n.velocity,
      }),
    [letters, tr],
  );

  const onAnnounce = useCallback(
    (text: string) => {
      setAnnouncement(
        /^\d+$/.test(text) ? tr("announce.count", { n: Number(text) }) : text,
      );
    },
    [tr],
  );

  const togglePlay = async () => {
    if (playing) {
      stopPlayback();
      return;
    }
    const result = await play();
    if (result === "noAudio")
      toast.error(tr("noAudio")); // F236
    else if (result === "noNotes") toast.error(tr("noNotes"));
    else if (result === "unavailable") toast.error(tr("audioUnavailable"));
  };

  const doExport = useCallback(async () => {
    const result = await exportMidi();
    if (result.kind === "empty") toast.info(tr("nothingToExport"));
    else if (result.kind !== "cancelled")
      toast.success(tr("exported", { n: result.n, bpm: result.bpm }));
  }, [tr]);

  const editsLocked =
    busy === "capturing" || busy === "requesting" || busy === "analysing";
  const selectedNotes = doc.notes.filter((n) => selection.has(n.id));

  return (
    <ModulePage
      title={t("rollTitle")}
      description={tr("description")}
      className="max-w-7xl"
      actions={
        <Button
          variant="ghost"
          onClick={() => {
            // F226, U17: back to the results stops the microphone and playback.
            void stopEverything();
            goTo("analyse");
          }}
        >
          <ArrowLeftIcon aria-hidden />
          {t("backToAnalysis")}
        </Button>
      }
    >
      <SourcePanel />

      {/* Toolbar */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-2">
        <div className="flex flex-wrap items-center gap-2">
          <Group label={tr("tools.label")}>
            <ToggleGroup
              type="single"
              value={settings.tool}
              onValueChange={(v) => v && setRollSettings({ tool: v as Tool })}
              aria-label={tr("tools.label")}
              className="inline-flex gap-1 rounded-lg bg-surface-2 p-1"
            >
              {(["select", "draw", "erase"] as const).map((tool, i) => {
                const Icon = TOOL_ICONS[tool];
                return (
                  <ToggleItem
                    key={tool}
                    value={tool}
                    label={`${tr(`tools.${tool}`)} (${i + 1})`}
                  >
                    <Icon className="size-4" aria-hidden />
                  </ToggleItem>
                );
              })}
            </ToggleGroup>
          </Group>

          <Group label={tr("transportLabel")}>
            <IconButton label={tr("home")} onClick={home}>
              <SkipBackIcon />
            </IconButton>
            <TransportButton
              playing={playing}
              onToggle={() => void togglePlay()}
            />
            <IconButton
              label={tr("loop")}
              pressed={loop !== null}
              onClick={() =>
                setLoop(
                  loop
                    ? null
                    : {
                        start:
                          visible.start + (visible.end - visible.start) * 0.25,
                        end:
                          visible.start + (visible.end - visible.start) * 0.75,
                      },
                )
              }
            >
              <RepeatIcon />
            </IconButton>
          </Group>

          <SegmentedControl<PlayMode>
            aria-label={tr("playMode.label")}
            className="w-auto"
            value={settings.playMode}
            onValueChange={(playMode) => {
              stopPlayback();
              setRollSettings({ playMode });
            }}
            options={[
              { value: "audio", label: tr("playMode.audio") },
              { value: "piano", label: tr("playMode.piano") },
            ]}
          />

          <Stepper
            label={tr("bpm")}
            value={doc.bpm}
            min={BPM_MIN}
            max={BPM_MAX}
            step={BPM_STEP}
            onChange={(bpm) => setRollDoc({ bpm: clampBpm(bpm) })}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Group label={tr("editLabel")}>
            <label className="flex items-center gap-2 text-xs font-medium text-fg-muted">
              {tr("grid.label")}
              <select
                value={settings.grid}
                onChange={(e) =>
                  setRollSettings({ grid: e.target.value as Grid })
                }
                className="h-11 rounded-md border border-border bg-surface px-2 text-sm text-fg"
              >
                {GRIDS.map((g) => (
                  <option key={g} value={g}>
                    {tr(`grid.${GRID_KEYS[g]}`)}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="secondary"
              disabled={editsLocked || doc.notes.length === 0}
              onClick={() =>
                setRollDoc({
                  notes: quantize(
                    doc.notes,
                    settings.grid,
                    doc.bpm,
                    selection.size > 0 ? selection : undefined,
                  ),
                })
              }
            >
              <MagnetIcon aria-hidden />
              {tr("quantize")}
            </Button>
            <IconButton
              label={tr("deleteSelected")}
              disabled={editsLocked || selection.size === 0}
              onClick={() => {
                setRollDoc({ notes: removeNotes(doc.notes, selection) });
                session.set({ selection: new Set() });
              }}
            >
              <Trash2Icon />
            </IconButton>
            <IconButton
              label={tr("clear")}
              disabled={editsLocked || doc.notes.length === 0}
              onClick={() => {
                // F264: remove all notes; the view resets to 0…duration.
                setRollDoc({ notes: [] });
                session.set({
                  selection: new Set(),
                  view: fitView(doc.duration),
                });
              }}
            >
              <ListXIcon />
            </IconButton>
            <IconButton
              label={tr("undo")}
              disabled={!undoRedo.canUndo}
              onClick={undoRedo.undo}
            >
              <Undo2Icon />
            </IconButton>
            <IconButton
              label={tr("redo")}
              disabled={!undoRedo.canRedo}
              onClick={undoRedo.redo}
            >
              <Redo2Icon />
            </IconButton>
          </Group>

          <Group label={tr("viewLabel")}>
            <IconButton
              label={tr("heatmap")}
              pressed={settings.heatmap}
              onClick={() => setRollSettings({ heatmap: !settings.heatmap })}
            >
              <FlameIcon />
            </IconButton>
            <IconButton
              label={tr("zoomIn")}
              onClick={() =>
                session.set({ view: zoomIn(visible, doc.duration) })
              }
            >
              <ZoomInIcon />
            </IconButton>
            <IconButton
              label={tr("zoomOut")}
              onClick={() =>
                session.set({ view: zoomOut(visible, doc.duration) })
              }
            >
              <ZoomOutIcon />
            </IconButton>
            <IconButton
              label={tr("fit")}
              onClick={() => session.set({ view: fitView(doc.duration) })}
            >
              <Maximize2Icon />
            </IconButton>
          </Group>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              disabled={doc.notes.length === 0}
              onClick={() =>
                goTo("palette", {
                  mode: "free",
                  notes: distinctPitchClasses(doc.notes).join(","),
                })
              }
            >
              <PaletteIcon aria-hidden />
              {tr("openPalette")}
            </Button>
            <Button variant="primary" onClick={() => void doExport()}>
              <DownloadIcon aria-hidden />
              {tr("exportMidi")}
            </Button>
          </div>
        </div>
      </div>

      {/* The roll (F246–F260) */}
      <div className="flex flex-col gap-2">
        <div
          id={canvasId}
          className="h-[clamp(340px,62vh,720px)] w-full overflow-hidden rounded-xl border border-border"
        >
          <RollCanvas
            notes={doc.notes}
            bpm={doc.bpm}
            duration={doc.duration}
            settings={settings}
            letters={letters}
            label={tr("canvasLabel")}
            roleDescription={tr("roleDescription")}
            describedBy={helpId}
            onAnnounce={onAnnounce}
            describeNote={describeNote}
            onExport={() => void doExport()}
          />
        </div>
        <TimeScrollbarSlot
          canvasId={canvasId}
          label={tr("scrollbar")}
          valueText={tr("visible", {
            start: fmt(visible.start),
            end: fmt(visible.end),
            duration: fmt(doc.duration),
          })}
        />
        <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-fg-muted">
          <p id={helpId} className="sr-only max-w-3xl sm:not-sr-only">
            {tr("canvasHelp")} {tr("loopHint")}
          </p>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm">
                <KeyboardIcon aria-hidden />
                {tr("shortcuts")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-w-sm text-sm">
              {tr("canvasHelp")}
            </PopoverContent>
          </Popover>
        </div>
        <p aria-live="polite" className="sr-only" data-testid="roll-announcer">
          {announcement}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SelectionPanel
          notes={selectedNotes}
          describeNote={describeNote}
          letters={letters}
        />
        <SummaryPanel notes={doc.notes} letters={letters} />
      </div>
    </ModulePage>
  );
}

// --- Small parts ---------------------------------------------------------------

function TimeScrollbarSlot({
  canvasId,
  label,
  valueText,
}: {
  canvasId: string;
  label: string;
  valueText: string;
}) {
  const view = useRollSession((s) => s.view);
  const doc = useRollDoc();
  return (
    <TimeScrollbar
      view={viewOrFit(view, doc.duration)}
      duration={doc.duration}
      onChange={(next) => session.set({ view: next })}
      label={label}
      valueText={valueText}
      controls={canvasId}
    />
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-center gap-1"
    >
      {children}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <Button
        variant={pressed ? "subtle" : "ghost"}
        size="icon"
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onClick}
        className={cn(pressed && "text-accent")}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

function ToggleItem({
  value,
  label,
  children,
  ...props
}: {
  value: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <ToggleGroupPrimitive.Item
      value={value}
      aria-label={label}
      title={label}
      className="grid size-11 place-items-center rounded-md text-fg-muted hover:text-fg data-[state=on]:bg-surface data-[state=on]:text-fg data-[state=on]:shadow-1"
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

/** F249: the selected notes, with a velocity edit (one undo step per change). */
function SelectionPanel({
  notes,
  describeNote,
  letters,
}: {
  notes: readonly RollNote[];
  describeNote: (n: RollNote) => string;
  letters: readonly string[];
}) {
  const tr = useTranslations("modules.analyse.roll");
  const [draft, setDraft] = useState<number | null>(null);
  const first = notes[0];
  const velocity =
    draft ??
    (notes.length > 0
      ? Math.round(notes.reduce((s, n) => s + n.velocity, 0) / notes.length)
      : 90);
  return (
    <section
      aria-labelledby="roll-selection-title"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <h2 id="roll-selection-title" className="text-sm font-semibold">
        {tr("selection.title")}
      </h2>
      {notes.length === 0 || !first ? (
        <p className="text-sm text-fg-muted">{tr("selection.none")}</p>
      ) : (
        <>
          <p className="text-sm">
            {tr("selection.count", { n: notes.length })}
          </p>
          {notes.length === 1 && (
            <dl
              className="grid grid-cols-3 gap-2 text-sm"
              aria-label={describeNote(first)}
            >
              <div>
                <dt className="text-xs text-fg-muted">
                  {tr("selection.pitch")}
                </dt>
                <dd
                  className="font-semibold"
                  style={{ color: `var(--note-${first.midi % 12})` }}
                >
                  {letters[first.midi % 12]}
                  {Math.floor(first.midi / 12) - 1}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-fg-muted">
                  {tr("selection.start")}
                </dt>
                <dd className="tabular">
                  {tr("selection.seconds", { value: fmt(first.start) })}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-fg-muted">
                  {tr("selection.length")}
                </dt>
                <dd className="tabular">
                  {tr("selection.seconds", { value: fmt(first.duration) })}
                </dd>
              </div>
            </dl>
          )}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-fg-muted">
              {tr("selection.velocity")}
            </span>
            <Slider
              aria-label={tr("selection.velocity")}
              min={1}
              max={127}
              step={1}
              value={[velocity]}
              onValueChange={([v]) => setDraft(v ?? velocity)}
              onValueCommit={([v]) => {
                setDraft(null);
                if (v === undefined) return;
                const ids = new Set(notes.map((n) => n.id));
                setRollDoc((d) => ({ notes: setVelocity(d.notes, ids, v) }));
              }}
            />
            <output className="w-8 text-right text-sm font-semibold tabular">
              {velocity}
            </output>
          </div>
        </>
      )}
    </section>
  );
}

/** F261: the number of notes and, per pitch class, its count; a choice selects those notes. */
function SummaryPanel({
  notes,
  letters,
}: {
  notes: readonly RollNote[];
  letters: readonly string[];
}) {
  const tr = useTranslations("modules.analyse.roll");
  const summary = pitchClassSummary(notes);
  return (
    <section
      aria-labelledby="roll-summary-title"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <h2
        id="roll-summary-title"
        className="flex items-baseline justify-between text-sm font-semibold"
      >
        {tr("summary.title")}
        <span className="font-normal text-fg-muted" data-testid="roll-count">
          {tr("summary.count", { n: notes.length })}
        </span>
      </h2>
      {notes.length === 0 ? (
        <p className="text-sm text-fg-muted">{tr("summary.empty")}</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {summary.map(({ pc, count }) => (
            <li key={pc}>
              <button
                type="button"
                aria-label={tr("summary.selectPc", {
                  note: letters[pc] ?? "",
                  count,
                })}
                onClick={() =>
                  session.set({
                    selection: notesOfPitchClass(notes, toPitchClass(pc)),
                  })
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm hover:bg-surface-2"
              >
                <span
                  aria-hidden
                  className="size-3 rounded-full"
                  style={{ background: `var(--note-${pc})` }}
                />
                <span className="font-semibold">{letters[pc]}</span>
                <span className="text-fg-muted tabular">{count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
