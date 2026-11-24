"use client";

import {
  DicesIcon,
  DownloadIcon,
  ListPlusIcon,
  PauseIcon,
  PlayIcon,
  SquareIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useId,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { audioEngine } from "@/audio";
import { shareOrDownload } from "@/platform";
import { useSettings } from "@/state";
import {
  ENDLESS_STYLES,
  PITCH_CLASSES,
  SCALE_IDS,
  effectiveScale,
  getChordType,
  getEndlessStyle,
  letterName,
  slotBeats,
  type EndlessStyleId,
  type ScaleId,
} from "@/theory";
import { Button } from "@/ui/components/button";
import { toast } from "@/ui/components/toaster";
import { cn } from "@/ui/cn";
import { ModulePage } from "@/ui/module-page";
import { BpmField, NoteChip } from "@/ui/music";
import { rovingKeyDown } from "@/ui/roving";
import { SEND_LAST_COUNT, historyToMidi, sendToTimeline } from "./export";
import {
  endlessGenerator,
  wireEndlessGenerator,
  type GeneratorSnapshot,
  type HistoryEntry,
} from "./generator";
import { setEndless, useEndlessSettings } from "./settings";

/** F163: the list shows the last 8 chords. */
const LIST_COUNT = 8;
/** F164: a chosen listed chord is marked as sounding for 1.8 s. */
const LIST_PLAY_MARK_SECONDS = 1.8;

function useGenerator(): GeneratorSnapshot {
  return useSyncExternalStore(
    endlessGenerator.subscribe,
    endlessGenerator.getSnapshot,
    endlessGenerator.getSnapshot,
  );
}

function useChordText() {
  const { spelling } = useSettings();
  return (entry: HistoryEntry) =>
    letterName(entry.chord.root, spelling) +
    getChordType(entry.chord.type).symbol;
}

export function EndlessView() {
  const t = useTranslations("modules.endless");
  const snapshot = useGenerator();

  useEffect(() => wireEndlessGenerator(), []);

  // Space starts and stops, except on a control that uses Space itself.
  useHotkeys(
    "space",
    (event) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.matches("button, a, input, select, textarea, [role]")
      )
        return;
      event.preventDefault();
      endlessGenerator.toggle();
    },
    { preventDefault: false },
  );

  return (
    <ModulePage
      title={t("title")}
      description={t("description")}
      actions={<Transport status={snapshot.status} />}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="flex min-w-0 flex-col gap-6">
          <CurrentChord snapshot={snapshot} />
          <History snapshot={snapshot} />
        </div>
        <Settings />
      </div>
    </ModulePage>
  );
}

function Transport({ status }: { status: GeneratorSnapshot["status"] }) {
  const t = useTranslations("modules.endless");
  const running = status === "running";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p
        role="status"
        aria-label={t("statusLabel")}
        data-status={status}
        className={cn(
          "inline-flex min-h-9 items-center gap-2 rounded-full px-3 text-sm font-medium",
          running && "bg-success-soft text-fg",
          status === "paused" && "bg-warning-soft text-fg",
          status === "idle" && "bg-surface-2 text-fg-muted",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-2 rounded-full",
            running && "animate-pulse bg-success motion-reduce:animate-none",
            status === "paused" && "bg-warning",
            status === "idle" && "bg-fg-subtle",
          )}
        />
        {t(`status.${status}`)}
      </p>
      <Button
        variant="primary"
        size="lg"
        onClick={() => endlessGenerator.toggle()}
        aria-keyshortcuts="Space"
      >
        {running ? (
          <SquareIcon className="fill-current" aria-hidden />
        ) : status === "paused" ? (
          <PauseIcon aria-hidden />
        ) : (
          <PlayIcon className="fill-current" aria-hidden />
        )}
        {running ? t("stop") : status === "paused" ? t("resume") : t("start")}
      </Button>
    </div>
  );
}

function CurrentChord({ snapshot }: { snapshot: GeneratorSnapshot }) {
  const t = useTranslations("modules.endless");
  const chordText = useChordText();
  const current =
    snapshot.currentId === null
      ? null
      : (snapshot.history.find((e) => e.id === snapshot.currentId) ?? null);
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-1"
    >
      <h2 id={titleId} className="text-sm font-medium text-fg-muted">
        {t("currentTitle")}
      </h2>
      {current ? (
        <div className="flex flex-wrap items-center gap-5">
          <div
            aria-live="polite"
            style={
              { "--note": `var(--note-${current.chord.root})` } as CSSProperties
            }
            className="flex min-h-24 min-w-28 items-center justify-center gap-1 rounded-2xl bg-(--note) px-5 text-4xl font-semibold text-note-on shadow-2"
          >
            {chordText(current)}
            {current.seventh && (
              <span
                className="ml-1 rounded-full bg-note-on/15 px-1.5 text-base"
                title={t("seventhMark")}
              >
                <span aria-hidden>✦</span>
                <span className="sr-only">{t("seventhMark")}</span>
              </span>
            )}
          </div>
          <div
            role="toolbar"
            aria-label={t("currentTitle")}
            onKeyDown={(e) => rovingKeyDown(e)}
            className="flex flex-wrap gap-2"
          >
            {current.notes.map((note, i) => (
              <NoteChip
                key={`${note.pc}-${note.octave}`}
                pc={note.pc}
                octave={note.octave}
                tabIndex={i === 0 ? 0 : -1}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="py-6 text-center text-fg-muted">{t("noNotes")}</p>
      )}
    </section>
  );
}

function History({ snapshot }: { snapshot: GeneratorSnapshot }) {
  const t = useTranslations("modules.endless");
  const chordText = useChordText();
  const settings = useEndlessSettings();
  const titleId = useId();
  const last = snapshot.history.slice(-LIST_COUNT);
  const total = snapshot.history.length;

  const play = (entry: HistoryEntry) =>
    audioEngine.playChord(entry.notes, {
      markSeconds: LIST_PLAY_MARK_SECONDS,
    });

  const send = (entries: readonly HistoryEntry[]) => {
    const count = sendToTimeline(entries);
    toast(t("sent", { count }));
  };

  const exportMidi = async () => {
    const bytes = historyToMidi(snapshot.history, settings.bpm);
    const seed = settings.seed.trim().replace(/[^\w-]+/g, "-") || "seed";
    const result = await shareOrDownload(
      new Uint8Array(bytes),
      `paleta-infinito-${seed}.mid`,
      "audio/midi",
    );
    if (result !== "cancelled") toast(t("exported"));
  };

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-1"
    >
      <h2 id={titleId} className="text-sm font-medium text-fg-muted">
        {t("historyTitle")}
      </h2>
      {last.length === 0 ? (
        <p className="text-sm text-fg-muted">{t("historyEmpty")}</p>
      ) : (
        <ol
          className="grid grid-cols-4 gap-2 sm:grid-cols-8"
          onKeyDown={(e) => rovingKeyDown(e, 4)}
        >
          {last.map((entry, i) => {
            const isCurrent = entry.id === snapshot.currentId;
            const name = chordText(entry);
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  data-roving
                  data-current={isCurrent || undefined}
                  tabIndex={i === last.length - 1 ? 0 : -1}
                  aria-current={isCurrent ? "true" : undefined}
                  aria-label={[
                    t("playChord", { chord: name }),
                    entry.seventh && t("seventhMark"),
                    isCurrent && t("currentMark"),
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  onClick={() => play(entry)}
                  style={
                    {
                      "--note": `var(--note-${entry.chord.root})`,
                    } as CSSProperties
                  }
                  className={cn(
                    "relative flex min-h-14 w-full flex-col items-center justify-center rounded-xl bg-(--note) px-1 font-semibold text-note-on shadow-1 transition-transform active:scale-95",
                    isCurrent &&
                      "ring-2 ring-fg ring-offset-2 ring-offset-surface",
                  )}
                >
                  <span>
                    {name}
                    {entry.seventh && <span aria-hidden> ✦</span>}
                  </span>
                  {isCurrent && (
                    <span aria-hidden className="text-[0.7rem] font-medium">
                      {t("currentMark")}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={total === 0}
          onClick={() => send(snapshot.history.slice(-SEND_LAST_COUNT))}
        >
          <ListPlusIcon aria-hidden />
          {t("sendLast", {
            count: Math.min(SEND_LAST_COUNT, total) || SEND_LAST_COUNT,
          })}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={total === 0}
          onClick={() => send(snapshot.history)}
        >
          {t("sendAll", { count: total })}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={total === 0}
          onClick={() => void exportMidi()}
        >
          <DownloadIcon aria-hidden />
          {t("exportMidi")}
        </Button>
      </div>
    </section>
  );
}

function Settings() {
  const t = useTranslations("modules.endless");
  const tScales = useTranslations("scales");
  const settings = useEndlessSettings();
  const style = getEndlessStyle(settings.style);
  const ids = {
    key: useId(),
    scale: useId(),
    scaleHint: useId(),
    style: useId(),
    seed: useId(),
    seedHint: useId(),
    smooth: useId(),
    smoothHint: useId(),
  };
  const styleName = t(`styles.${settings.style}.name`);
  const shownScale = effectiveScale(settings.style, settings.scale);

  return (
    <section
      aria-label={t("settingsTitle")}
      className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 shadow-1"
    >
      <div className="flex flex-col gap-2">
        <span id={ids.key} className="text-xs font-medium text-fg-muted">
          {t("keyLabel")}
        </span>
        <div
          role="radiogroup"
          aria-labelledby={ids.key}
          onKeyDown={(e) => rovingKeyDown(e, 6)}
          className="grid grid-cols-6 gap-1.5"
        >
          {PITCH_CLASSES.map((pc) => (
            <KeyChoice
              key={pc}
              pc={pc}
              selected={settings.key === pc}
              onSelect={() => setEndless({ key: pc })}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor={ids.scale}
          className="text-xs font-medium text-fg-muted"
        >
          {t("scaleLabel")}
        </label>
        <select
          id={ids.scale}
          value={shownScale}
          disabled={style.minor}
          aria-describedby={style.minor ? ids.scaleHint : undefined}
          onChange={(e) => setEndless({ scale: e.target.value as ScaleId })}
          className="h-11 rounded-md border border-border bg-surface px-3 text-sm disabled:opacity-60"
        >
          {SCALE_IDS.map((id) => (
            <option key={id} value={id}>
              {tScales(id)}
            </option>
          ))}
        </select>
        {style.minor && (
          <p id={ids.scaleHint} className="text-xs text-fg-muted">
            {t("scaleForced", { style: styleName })}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span id={ids.style} className="text-xs font-medium text-fg-muted">
          {t("styleLabel")}
        </span>
        <div
          role="radiogroup"
          aria-labelledby={ids.style}
          onKeyDown={(e) => rovingKeyDown(e, 3)}
          className="grid grid-cols-3 gap-1.5"
        >
          {ENDLESS_STYLES.map((s) => (
            <StyleChoice
              key={s.id}
              id={s.id}
              selected={settings.style === s.id}
            />
          ))}
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg bg-surface-2 p-3 text-sm">
          <dt className="col-span-2 font-semibold">
            {styleName}
            <span className="ml-2 font-normal text-fg-muted">
              {t(`styles.${settings.style}.description`)}
            </span>
          </dt>
          <dt className="text-fg-muted">{t("tension")}</dt>
          <dd className="tabular">{Math.round(style.tension * 100)} %</dd>
          <dt className="text-fg-muted">{t("baseBpm")}</dt>
          <dd className="tabular">{style.bpm}</dd>
          <dt className="text-fg-muted">{t("mode")}</dt>
          <dd>
            {style.minor ? t("modeMinor") : t("modeMixed")} ·{" "}
            {t("slot", { beats: slotBeats(style.id) })}
          </dd>
        </dl>
      </div>

      <BpmField value={settings.bpm} onChange={(bpm) => setEndless({ bpm })} />

      <div className="flex flex-col gap-2">
        <label htmlFor={ids.seed} className="text-xs font-medium text-fg-muted">
          {t("seedLabel")}
        </label>
        <div className="flex gap-2">
          <input
            id={ids.seed}
            value={settings.seed}
            maxLength={64}
            spellCheck={false}
            autoComplete="off"
            aria-describedby={ids.seedHint}
            onChange={(e) => setEndless({ seed: e.target.value })}
            className="h-11 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 font-mono text-sm"
          />
          <Button
            size="icon"
            aria-label={t("newSeed")}
            title={t("newSeed")}
            onClick={() =>
              setEndless({
                seed: String(Math.floor(Math.random() * 1_000_000)),
              })
            }
          >
            <DicesIcon aria-hidden />
          </Button>
        </div>
        <p id={ids.seedHint} className="text-xs text-fg-muted">
          {t("seedHint")}
        </p>
      </div>

      <div className="flex items-start gap-3">
        <input
          id={ids.smooth}
          type="checkbox"
          checked={settings.smooth}
          aria-describedby={ids.smoothHint}
          onChange={(e) => setEndless({ smooth: e.target.checked })}
          className="mt-0.5 size-5 accent-(--accent)"
        />
        <div className="flex flex-col">
          <label htmlFor={ids.smooth} className="text-sm font-medium">
            {t("smoothLabel")}
          </label>
          <p id={ids.smoothHint} className="text-xs text-fg-muted">
            {t("smoothHint")}
          </p>
        </div>
      </div>
    </section>
  );
}

function KeyChoice({
  pc,
  selected,
  onSelect,
}: {
  pc: (typeof PITCH_CLASSES)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const { spelling } = useSettings();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-roving
      data-pc={pc}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      style={{ "--note": `var(--note-${pc})` } as CSSProperties}
      className={cn(
        "min-h-11 rounded-lg border-b-4 border-(--note) text-sm font-semibold transition-[background-color,transform] active:scale-95",
        selected
          ? "bg-(--note) text-note-on ring-2 ring-fg ring-offset-2 ring-offset-surface"
          : "bg-surface-2 text-fg hover:bg-border",
      )}
    >
      {letterName(pc, spelling)}
    </button>
  );
}

function StyleChoice({
  id,
  selected,
}: {
  id: EndlessStyleId;
  selected: boolean;
}) {
  const t = useTranslations("modules.endless");
  const style = getEndlessStyle(id);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-roving
      tabIndex={selected ? 0 : -1}
      // F157: a style sets its base BPM.
      onClick={() => setEndless({ style: id, bpm: style.bpm })}
      className={cn(
        "flex min-h-11 flex-col items-center justify-center rounded-lg border px-1 text-sm font-medium transition-colors",
        selected
          ? "border-accent bg-accent text-accent-fg"
          : "border-border bg-surface hover:bg-surface-2",
      )}
    >
      {t(`styles.${id}.name`)}
    </button>
  );
}
