"use client";

import {
  AudioWaveformIcon,
  FileUpIcon,
  MicIcon,
  ScanSearchIcon,
  SquareIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useGoTo } from "@/nav";
import { PITCH_CLASSES } from "@/theory";
import { Button } from "@/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/dialog";
import { SegmentedControl } from "@/ui/components/toggle-group";
import { NoteChip } from "@/ui/music";
import { Requires } from "@/ui/requires";
import { useDecodedFile } from "../../decoded-file";
import {
  analyseFile,
  importMidi,
  startMic,
  stopMic,
} from "../engine/controller";
import { useRollSession } from "../engine/session";
import type { MicMode } from "../lib/model";
import { getRollDoc, setRollSettings, useRollSettings } from "../state";
import { LiveSpectrum } from "./spectrum";

/** F237–F245: the note source (file analysis, microphone, .mid import), status and progress. */
export function SourcePanel() {
  const t = useTranslations("modules.analyse.roll");
  const goTo = useGoTo();
  const file = useDecodedFile();
  const settings = useRollSettings();
  const status = useRollSession((s) => s.status);
  const progress = useRollSession((s) => s.progress);
  const busy = useRollSession((s) => s.busy);
  const capture = useRollSession((s) => s.capture);
  const [confirmCount, setConfirmCount] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const capturing = busy === "capturing" || busy === "requesting";

  const requestCapture = () => {
    const n = getRollDoc().notes.length;
    // U20: a new capture replaces the roll only after a confirmation.
    if (n > 0) setConfirmCount(n);
    else void startMic(settings.micMode);
  };

  return (
    <section
      aria-labelledby="roll-source-title"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <h2 id="roll-source-title" className="text-sm font-semibold">
        {t("source.title")}
      </h2>

      <div className="grid gap-3 md:grid-cols-2">
        {/* File (F237–F240). The roll reads the decoded file; it never decodes. */}
        <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
          {file ? (
            <>
              <p className="flex min-w-0 items-center gap-2 text-sm">
                <AudioWaveformIcon
                  className="size-4 shrink-0 text-fg-muted"
                  aria-hidden
                />
                <span className="truncate">
                  {t("source.file", { name: file.name })}
                </span>
              </p>
              <Button
                variant="primary"
                onClick={() => void analyseFile()}
                disabled={busy !== null}
              >
                <ScanSearchIcon aria-hidden />
                {t("source.analyse")}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">{t("source.noFileTitle")}</p>
              <p className="text-sm text-fg-muted">{t("source.noFileBody")}</p>
              <Button
                variant="secondary"
                onClick={() => goTo("analyse")}
                disabled={capturing}
              >
                <AudioWaveformIcon aria-hidden />
                {t("source.goAnalyse")}
              </Button>
            </>
          )}
        </div>

        {/* Microphone (F241–F245) and .mid import. */}
        <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-3">
          <Requires capability="getUserMedia">
            <SegmentedControl<MicMode>
              aria-label={t("source.micMode")}
              value={settings.micMode}
              onValueChange={(micMode) => setRollSettings({ micMode })}
              options={[
                { value: "mono", label: t("source.mono") },
                { value: "poly", label: t("source.poly") },
              ]}
            />
            {capturing ? (
              <Button variant="danger" onClick={() => void stopMic()}>
                <SquareIcon className="fill-current" aria-hidden />
                {t("source.micStop")}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={requestCapture}
                disabled={busy !== null}
              >
                <MicIcon aria-hidden />
                {t("source.micStart")}
              </Button>
            )}
          </Requires>
          <Button
            variant="ghost"
            onClick={() => fileInput.current?.click()}
            disabled={busy !== null}
          >
            <FileUpIcon aria-hidden />
            {t("source.importMidi")}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".mid,.midi,audio/midi,audio/x-midi"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              const picked = e.target.files?.[0];
              e.target.value = "";
              if (picked) void importMidi(picked);
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p
          role="status"
          aria-live="polite"
          data-testid="roll-status"
          className={
            status.error ? "text-sm text-danger" : "text-sm text-fg-muted"
          }
        >
          {t(`status.${status.key}`, status.values)}
        </p>
        {progress !== null && (
          <div
            role="progressbar"
            aria-label={t("source.progress")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
          >
            <div
              className="h-full bg-accent transition-[width] duration-(--duration-fast)"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {capture && (
        <div className="flex flex-col gap-2">
          <LiveSpectrum capture={capture} label={t("source.spectrum")} />
          <div
            role="group"
            aria-label={t("source.liveNotes")}
            className="grid grid-cols-6 gap-1.5 sm:grid-cols-12"
          >
            {PITCH_CLASSES.map((pc) => (
              <NoteChip
                key={pc}
                pc={pc}
                size="sm"
                playsNote={false}
                tabIndex={-1}
              />
            ))}
          </div>
        </div>
      )}

      <Dialog
        open={confirmCount !== null}
        onOpenChange={(open) => !open && setConfirmCount(null)}
      >
        <DialogContent closeLabel={t("close")}>
          <DialogHeader>
            <DialogTitle>{t("confirmCapture.title")}</DialogTitle>
            <DialogDescription>
              {t("confirmCapture.body", { n: confirmCount ?? 0 })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">{t("confirmCapture.cancel")}</Button>
            </DialogClose>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmCount(null);
                void startMic(settings.micMode);
              }}
            >
              <MicIcon aria-hidden />
              {t("confirmCapture.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
