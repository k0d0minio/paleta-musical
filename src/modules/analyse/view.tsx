"use client";

import {
  AlertCircleIcon,
  AudioWaveformIcon,
  FileAudioIcon,
  GridIcon,
  InfoIcon,
  Loader2Icon,
  RotateCcwIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { audioEngine } from "@/audio";
import { useGoTo } from "@/nav";
import { useAppStore } from "@/state";
import { Button } from "@/ui/components/button";
import { cn } from "@/ui/cn";
import { ModulePage } from "@/ui/module-page";
import {
  analyse,
  cancelAnalysis,
  cancelByUser,
  discard,
  loadFile,
  restoreFile,
  setRegion,
  useAnalyseRuntime,
  type Phase,
} from "./controller";
import { useDecodedFile } from "./decoded-file";
import { ACCEPT, playableFormats } from "./decode";
import { formatTime, kilobytes } from "./format";
import { readLastAnalysis, type LastAnalysis, type Region } from "./persist";
import { ChordsPanel, NotesPanel, ScalesPanel, SectionsPanel } from "./results";
import { Waveform } from "./waveform";

/** F209: a visible, labelled file input (iOS opens the picker from a direct tap on it). */
function FilePicker({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("modules.analyse.analysis");
  const id = useId();
  return (
    <div className={cn("flex flex-col gap-2", compact ? "" : "items-center")}>
      <label htmlFor={id} className="text-sm font-medium">
        {compact ? t("loadAnother") : t("pickLabel")}
      </label>
      <input
        id={id}
        type="file"
        accept={ACCEPT}
        data-testid="audio-file-input"
        // A tap is a gesture: unlock audio so decoding can use the shared context.
        onClick={() => audioEngine.unlock()}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) void loadFile(file);
        }}
        className={cn(
          "max-w-full cursor-pointer rounded-lg border border-border bg-surface text-sm text-fg-muted",
          "file:mr-3 file:h-11 file:cursor-pointer file:border-0 file:bg-accent file:px-4 file:font-medium file:text-accent-fg",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
        )}
      />
      {!compact && <p className="text-xs text-fg-muted">{t("pickHint")}</p>}
    </div>
  );
}

/** F211, F212: status text, progress bar and cancel. */
function StatusPanel({
  phase,
  sizeBytes,
}: {
  phase: Phase;
  sizeBytes: number | null;
}) {
  const t = useTranslations("modules.analyse.analysis");
  const formats = useMemo(() => playableFormats(), []);
  if (phase.kind === "idle") return null;

  if (phase.kind === "error") {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4"
      >
        <AlertCircleIcon
          className="mt-0.5 size-5 shrink-0 text-danger"
          aria-hidden
        />
        <div className="flex flex-col gap-1 text-sm">
          {phase.reason === "read" ? (
            <p className="font-medium">{t("errorRead")}</p>
          ) : (
            <>
              <p className="font-medium">
                {t("errorMessage", { message: phase.message })}
              </p>
              <p>{t("errorHint")}</p>
              {formats.length > 0 && (
                <p className="text-fg-muted">
                  {t("formats", { formats: formats.join(", ") })}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  if (phase.kind === "cancelled") {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-sm text-fg-muted"
      >
        <InfoIcon className="size-4" aria-hidden />
        {t("cancelled")}
      </p>
    );
  }

  const text =
    phase.kind === "reading"
      ? t("statusReading", { name: phase.name })
      : phase.kind === "decoding"
        ? t("statusDecoding", { name: phase.name })
        : {
            chroma: t("statusChroma"),
            scales: t("statusScales"),
            chords: t("statusChords"),
            sections: t("statusSections"),
          }[phase.step];
  const progress = phase.kind === "analysing" ? phase.progress : undefined;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Loader2Icon
            className="size-4 shrink-0 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
          <p
            role="status"
            aria-live="polite"
            className="truncate text-sm font-medium"
          >
            {text}
          </p>
        </div>
        {phase.kind === "analysing" && (
          <Button size="sm" variant="ghost" onClick={cancelByUser}>
            <XIcon aria-hidden />
            {t("cancel")}
          </Button>
        )}
      </div>
      <progress
        aria-label={t("progressLabel")}
        max={1}
        value={progress}
        className="h-2 w-full appearance-none overflow-hidden rounded-full bg-surface-2 [&::-moz-progress-bar]:bg-accent [&::-webkit-progress-bar]:bg-surface-2 [&::-webkit-progress-value]:bg-accent"
      />
      {sizeBytes !== null && (
        <p className="text-xs text-fg-muted tabular">
          {t("statusDetail", { size: kilobytes(sizeBytes) })}
        </p>
      )}
    </div>
  );
}

function FileSummary({ last }: { last: LastAnalysis | null }) {
  const t = useTranslations("modules.analyse.analysis");
  const file = useAnalyseRuntime((s) => s.file) ?? last?.file ?? null;
  if (!file) return null;
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-2">
          <FileAudioIcon className="size-5 text-fg-muted" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold" data-testid="file-name">
            {file.name}
          </p>
          <p className="text-sm text-fg-muted tabular">
            {t("duration", { seconds: Math.round(file.duration) })} ·{" "}
            {t("sampleRate", { khz: (file.sampleRate / 1000).toFixed(1) })} ·{" "}
            {t("size", { size: kilobytes(file.sizeBytes) })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <FilePicker compact />
        <Button variant="ghost" onClick={discard}>
          <Trash2Icon aria-hidden />
          {t("discard")}
        </Button>
      </div>
    </div>
  );
}

/** The analyse module (F207–F225). */
export function AnalyseView() {
  const t = useTranslations("modules.analyse");
  const tA = useTranslations("modules.analyse.analysis");
  const goTo = useGoTo();
  const hydrated = useAppStore((s) => s.session.hydrated);
  const stored = useAppStore((s) => s.modules.analyse.last);
  const last = useMemo(() => readLastAnalysis(stored), [stored]);
  const phase = useAnalyseRuntime((s) => s.phase);
  const runtimeFile = useAnalyseRuntime((s) => s.file);
  const fileUrl = useAnalyseRuntime((s) => s.fileUrl);
  const region = useAnalyseRuntime((s) => s.region);
  const mainThread = useAnalyseRuntime((s) => s.mainThread);
  const restore = useAnalyseRuntime((s) => s.restore);
  const decoded = useDecodedFile();
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  // Leaving the module stops the worker.
  useEffect(() => () => cancelAnalysis(), []);

  // After a reload: decode the stored file again (waveform, piano roll).
  useEffect(() => {
    if (hydrated && last && !decoded && !runtimeFile)
      void restoreFile(last.file);
  }, [hydrated, last, decoded, runtimeFile]);

  const duration = decoded?.buffer.duration ?? 0;
  const selection: Region = region ?? { start: 0, end: duration };
  const onSelection = useCallback((r: Region) => setRegion(r), []);
  const isWhole = selection.start <= 0.05 && selection.end >= duration - 0.05;

  // F208: drop a file anywhere on the module.
  const onDragEnter = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void loadFile(file);
  };

  const busy =
    phase.kind === "reading" ||
    phase.kind === "decoding" ||
    phase.kind === "analysing";
  const hasFile = runtimeFile !== null || last !== null;

  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="relative"
    >
      {dragging && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl border-2 border-dashed border-accent bg-bg/80 backdrop-blur-sm"
        >
          <p className="flex items-center gap-2 text-lg font-semibold">
            <UploadIcon className="size-5" aria-hidden />
            {tA("dropHere")}
          </p>
        </div>
      )}
      <ModulePage
        title={t("title")}
        description={t("description")}
        actions={
          // F225: the piano roll is always one step away.
          <Button onClick={() => goTo("analyse", { view: "roll" })}>
            <GridIcon aria-hidden />
            {t("openRoll")}
          </Button>
        }
      >
        {!hasFile && !busy && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border-strong bg-surface/60 px-6 py-12 text-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-surface-2">
              <AudioWaveformIcon className="size-7 text-fg-muted" aria-hidden />
            </div>
            <p className="max-w-sm text-fg-muted">{tA("intro")}</p>
            <FilePicker />
            <p className="hidden text-xs text-fg-muted sm:block">
              {tA("dropHint")}
            </p>
          </div>
        )}

        {hasFile && <FileSummary last={last} />}

        <StatusPanel phase={phase} sizeBytes={runtimeFile?.sizeBytes ?? null} />

        {mainThread && busy && (
          <p
            role="note"
            className="flex items-center gap-2 text-sm text-fg-muted"
          >
            <InfoIcon className="size-4 shrink-0" aria-hidden />
            {tA("mainThread")}
          </p>
        )}

        {hasFile && (
          <section
            aria-label={tA("regionLabel")}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-1"
          >
            {decoded && fileUrl ? (
              <>
                <Waveform
                  name={decoded.name}
                  url={fileUrl}
                  buffer={decoded.buffer}
                  selection={selection}
                  onSelection={onSelection}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    disabled={busy || isWhole}
                    onClick={() => void analyse(selection)}
                  >
                    {tA("analyseRegion")}
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => {
                      setRegion(null);
                      void analyse(null);
                    }}
                  >
                    <RotateCcwIcon aria-hidden />
                    {last?.isRegion ? tA("analyseAll") : tA("analyseAgain")}
                  </Button>
                </div>
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm text-fg-muted">
                {restore === "pending" ? (
                  <>
                    <Loader2Icon
                      className="size-4 animate-spin motion-reduce:animate-none"
                      aria-hidden
                    />
                    {tA("restoring")}
                  </>
                ) : (
                  <>
                    <InfoIcon className="size-4" aria-hidden />
                    {tA("fileMissing")}
                  </>
                )}
              </p>
            )}
          </section>
        )}

        {last && !busy && (
          <div className="flex flex-col gap-4" data-testid="analysis-results">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">
                {last.isRegion
                  ? tA("resultOfRegion", {
                      start: formatTime(last.range.start),
                      end: formatTime(last.range.end),
                    })
                  : tA("resultOfFile")}
              </p>
              {last.truncated && (
                <p
                  role="note"
                  className="flex items-center gap-2 text-sm text-fg-muted"
                >
                  <InfoIcon className="size-4 shrink-0" aria-hidden />
                  {tA("truncated", {
                    seconds: Math.round(last.range.end - last.range.start),
                  })}
                </p>
              )}
            </div>
            <NotesPanel result={last.result} />
            <div className="grid gap-4 lg:grid-cols-2">
              <ScalesPanel result={last.result} />
              <ChordsPanel result={last.result} />
              <SectionsPanel result={last.result} offset={last.range.start} />
            </div>
          </div>
        )}
      </ModulePage>
    </div>
  );
}
