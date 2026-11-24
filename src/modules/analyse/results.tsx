"use client";

import {
  ListPlusIcon,
  MusicIcon,
  PaletteIcon,
  PlayIcon,
  ShapesIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import {
  activeNotes,
  chordStrengths,
  TOP_SHOWN,
  type AnalysisResult,
  type ChordCandidate,
  type ScaleCandidate,
  type Section,
} from "@/analysis";
import { audioEngine } from "@/audio";
import { useGoTo } from "@/nav";
import { useAppStore, useOctave } from "@/state";
import {
  chordPitchClasses,
  getChordType,
  realizeAscending,
  realizeChordInOctave,
  scalePitchClasses,
  type PitchClass,
} from "@/theory";
import { Button } from "@/ui/components/button";
import { toast } from "@/ui/components/toaster";
import { ChordName, NoteChip, NoteName, useNoteNameText } from "@/ui/music";
import { rovingKeyDown } from "@/ui/roving";
import { cn } from "@/ui/cn";
import { formatTime, percent } from "./format";

/** F217: a detected note plays 1.2 s and is marked as sounding for 1 s. */
const NOTE_PLAY = { duration: 1.2, markSeconds: 1 };
/** F221: scale notes 280 ms apart, each marked for 0.6 s. */
const SCALE_SPACING = 0.28;
const SCALE_MARK = 0.6;
/** F224: a chord is marked as sounding for 1.8 s. */
const CHORD_MARK = 1.8;
/** F216: the 8 strongest notes. */
const NOTES_SHOWN = 8;

function Panel({
  title,
  hint,
  icon: Icon,
  children,
  actions,
  className,
}: {
  title: string;
  hint?: string;
  icon: typeof MusicIcon;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-1 sm:p-5",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Icon className="mt-1 size-4 text-fg-muted" aria-hidden />
          <div>
            <h2 className="font-semibold">{title}</h2>
            {hint && <p className="text-sm text-fg-muted">{hint}</p>}
          </div>
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

function Meter({ value, pc }: { value: number; pc?: PitchClass }) {
  return (
    <span
      aria-hidden
      className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
    >
      <span
        className="block h-full rounded-full"
        style={{
          width: `${percent(value)}%`,
          background:
            pc === undefined ? "var(--fg-muted)" : `var(--note-${pc})`,
        }}
      />
    </span>
  );
}

function useScaleName() {
  const tScales = useTranslations("scales");
  const noteText = useNoteNameText();
  return (s: { root: PitchClass; scale: ScaleCandidate["scale"] }) =>
    `${noteText(s.root)} ${tScales(s.scale)}`;
}

function useChordText() {
  const noteText = useNoteNameText();
  return (c: { root: PitchClass; type: ChordCandidate["type"] }) =>
    `${noteText(c.root)}${getChordType(c.type).symbol}`;
}

/** F224: play the chord and keep it as the last chord. */
function usePlayChord() {
  const octave = useOctave();
  return (c: { root: PitchClass; type: ChordCandidate["type"] }) => {
    const pcs = chordPitchClasses(c.root, c.type);
    audioEngine.playChord(realizeChordInOctave(pcs, octave), {
      markSeconds: CHORD_MARK,
    });
    useAppStore
      .getState()
      .setLastChord(pcs, { root: c.root, type: c.type, inversion: 0 });
  };
}

/** F216, F217, F218. */
export function NotesPanel({ result }: { result: AnalysisResult }) {
  const t = useTranslations("modules.analyse.analysis");
  const goTo = useGoTo();
  const octave = useOctave();
  const shown = result.strengths.slice(0, NOTES_SHOWN);
  // F218 reads the same active notes as the chord candidates (see CHORDS_FROM_ENERGY).
  const linked = activeNotes(
    chordStrengths(result.chroma.full, result.strengths),
  );
  const notes = [...linked].sort((a, b) => a - b).join(",");
  return (
    <Panel
      title={t("notesTitle")}
      hint={t("notesHint")}
      icon={MusicIcon}
      actions={
        linked.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => goTo("chords", { notes })}>
              <ShapesIcon aria-hidden />
              {t("openInChords", { count: linked.length })}
            </Button>
            <Button
              size="sm"
              onClick={() => goTo("palette", { mode: "free", notes })}
            >
              <PaletteIcon aria-hidden />
              {t("openInPalette")}
            </Button>
          </div>
        )
      }
    >
      <ul
        role="toolbar"
        aria-label={t("notesTitle")}
        onKeyDown={(e) => rovingKeyDown(e)}
        className="grid grid-cols-4 gap-3 sm:grid-cols-8"
      >
        {shown.map((s, i) => (
          <li key={s.pc} className="flex flex-col items-stretch gap-1.5">
            <NoteChip
              pc={s.pc}
              size="md"
              playsNote={false}
              tabIndex={i === 0 ? 0 : -1}
              onPress={(pc) => audioEngine.playNote({ pc, octave }, NOTE_PLAY)}
            />
            <Meter value={s.strength} pc={s.pc} />
            <span className="text-center text-xs text-fg-muted tabular">
              {t("strength", { value: percent(s.strength) })}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** F219–F222. */
export function ScalesPanel({ result }: { result: AnalysisResult }) {
  const t = useTranslations("modules.analyse.analysis");
  const goTo = useGoTo();
  const octave = useOctave();
  const scaleName = useScaleName();
  const tScales = useTranslations("scales");
  const scales = result.scales.slice(0, TOP_SHOWN);
  const first = scales[0];

  const play = (s: ScaleCandidate) => {
    const notes = realizeAscending(scalePitchClasses(s.root, s.scale), octave);
    void audioEngine.schedule(
      notes.map((note, i) => ({
        at: i * SCALE_SPACING,
        notes: [note],
        kind: "note" as const,
        options: { markSeconds: SCALE_MARK },
      })),
    );
  };

  const use = (s: ScaleCandidate) => {
    const store = useAppStore.getState();
    store.setModuleState("palette", { tonic: s.root, scale: s.scale });
    store.setModuleState("progressions", { key: s.root, scale: s.scale });
    store.setModuleState("harmony", { tonic: s.root });
    toast.success(t("usedScale", { name: scaleName(s) }));
    goTo("palette", { mode: "scale", scale: s.scale, tonic: String(s.root) });
  };

  if (!first) {
    return (
      <Panel title={t("scalesTitle")} icon={PaletteIcon}>
        <p className="text-sm text-fg-muted">{t("noSignal")}</p>
      </Panel>
    );
  }

  return (
    <Panel title={t("scalesTitle")} icon={PaletteIcon}>
      <ol className="flex flex-col gap-2">
        {scales.map((s, i) => {
          const name = scaleName(s);
          const pcs = scalePitchClasses(s.root, s.scale);
          return (
            <li
              key={`${s.root}-${s.scale}`}
              className={cn(
                "flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center",
                i === 0
                  ? "border-border-strong bg-surface-2"
                  : "border-border bg-surface",
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span
                    aria-hidden
                    className="inline-block size-2.5 self-center rounded-full"
                    style={{ background: `var(--note-${s.root})` }}
                  />
                  <span className="font-semibold">
                    <NoteName pc={s.root} style="letter" /> {tScales(s.scale)}
                  </span>
                  {i === 0 && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-fg">
                      {t("mostLikely")}
                    </span>
                  )}
                </div>
                <p className="flex flex-wrap gap-1 text-sm">
                  {pcs.map((pc, k) => (
                    <span key={pc} className="inline-flex items-center gap-1">
                      {k > 0 && (
                        <span aria-hidden className="text-fg-muted">
                          ·
                        </span>
                      )}
                      <span
                        className="rounded px-1 font-medium text-note-on"
                        style={{ background: `var(--note-${pc})` }}
                      >
                        <NoteName pc={pc} style="letter" />
                      </span>
                    </span>
                  ))}
                </p>
                <div className="flex items-center gap-2">
                  <Meter value={s.confidence / 100} />
                  <span className="shrink-0 text-xs text-fg-muted tabular">
                    {t("confidence", { value: s.confidence })}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t("playScale", { name })}
                  onClick={() => play(s)}
                >
                  <PlayIcon aria-hidden />
                </Button>
                <Button
                  size="sm"
                  variant={i === 0 ? "primary" : "secondary"}
                  aria-label={t("useScaleLabel", { name })}
                  onClick={() => use(s)}
                >
                  {t("useScale")}
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      {result.tensions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">
            {t("tensionsTitle", { name: scaleName(first) })}
          </h3>
          <ul className="flex flex-wrap gap-3">
            {result.tensions.map((n) => (
              <li key={n.pc} className="flex items-center gap-2">
                <NoteChip
                  pc={n.pc}
                  size="sm"
                  tension
                  playsNote={false}
                  onPress={(pc) =>
                    audioEngine.playNote({ pc, octave }, NOTE_PLAY)
                  }
                />
                <span className="text-sm text-fg-muted tabular">
                  {t("strength", { value: percent(n.strength) })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/** F223, F224. */
export function ChordsPanel({ result }: { result: AnalysisResult }) {
  const t = useTranslations("modules.analyse.analysis");
  const playChord = usePlayChord();
  const chordText = useChordText();
  return (
    <Panel title={t("chordsTitle")} hint={t("chordsHint")} icon={ShapesIcon}>
      {result.chords.length === 0 ? (
        <p className="text-sm text-fg-muted">{t("noChords")}</p>
      ) : (
        <ol
          role="toolbar"
          aria-label={t("chordsTitle")}
          onKeyDown={(e) => rovingKeyDown(e)}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {result.chords.map((c, i) => (
            <li key={`${c.root}-${c.type}`}>
              <button
                type="button"
                data-roving
                tabIndex={i === 0 ? 0 : -1}
                aria-label={`${t("playChord", { name: chordText(c) })}, ${t("coverage", { value: percent(c.coverage) })}`}
                onClick={() => playChord(c)}
                className={cn(
                  "flex w-full flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors hover:bg-surface-2",
                  i === 0 ? "border-border-strong" : "border-border",
                )}
              >
                <ChordName
                  chord={{ root: c.root, type: c.type, inversion: 0 }}
                  className="text-lg"
                />
                <Meter value={c.coverage} pc={c.root} />
                <span className="text-xs whitespace-nowrap text-fg-muted tabular">
                  {t("coverage", { value: percent(c.coverage) })}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/** Merges equal neighbouring chords: what goes to the timeline. */
export function chordsOverTime(sections: readonly Section[]): ChordCandidate[] {
  const out: ChordCandidate[] = [];
  for (const s of sections) {
    const last = out.at(-1);
    if (!s.chord) continue;
    if (last && last.root === s.chord.root && last.type === s.chord.type)
      continue;
    out.push(s.chord);
  }
  return out;
}

/** Improvement: the likely chord and scale per window, in note colours; the chords can go to the timeline. */
export function SectionsPanel({
  result,
  offset,
}: {
  result: AnalysisResult;
  /** Start of the analysed range in the file, in seconds. */
  offset: number;
}) {
  const t = useTranslations("modules.analyse.analysis");
  const playChord = usePlayChord();
  const chordText = useChordText();
  const scaleName = useScaleName();
  const chords = chordsOverTime(result.sections);

  const send = () => {
    useAppStore.getState().timelineActions.append(
      chords.map((c) => ({
        chord: { root: c.root, type: c.type, inversion: 0 },
      })),
    );
    toast.success(t("sentToTimeline", { count: chords.length }));
  };

  return (
    <Panel
      title={t("timelineTitle")}
      hint={t("timelineHint")}
      icon={ListPlusIcon}
      className="lg:col-span-2"
      actions={
        chords.length > 0 && (
          <Button size="sm" onClick={send}>
            <ListPlusIcon aria-hidden />
            {t("sendToTimeline")}
          </Button>
        )
      }
    >
      <ol
        role="toolbar"
        aria-label={t("timelineTitle")}
        onKeyDown={(e) => rovingKeyDown(e)}
        data-testid="sections"
        className="flex w-full gap-1 overflow-x-auto pb-1"
      >
        {result.sections.map((s, i) => {
          const label = t("sectionLabel", {
            start: formatTime(offset + s.start),
            end: formatTime(offset + s.end),
            chord: s.chord ? chordText(s.chord) : t("sectionEmpty"),
            scale: s.scale ? scaleName(s.scale) : "–",
          });
          const style = s.chord
            ? ({ "--note": `var(--note-${s.chord.root})` } as CSSProperties)
            : undefined;
          return (
            <li
              key={i}
              className="min-w-14 flex-1"
              style={{ flexGrow: Math.max(0.1, s.end - s.start) }}
            >
              <button
                type="button"
                data-roving
                tabIndex={i === 0 ? 0 : -1}
                disabled={!s.chord}
                aria-label={label}
                title={label}
                onClick={() => s.chord && playChord(s.chord)}
                style={style}
                className={cn(
                  "flex h-16 w-full flex-col items-center justify-center rounded-lg px-1 text-sm font-semibold transition-transform active:scale-95",
                  s.chord
                    ? "bg-(--note) text-note-on"
                    : "bg-surface-2 text-fg-muted",
                )}
              >
                <span className="truncate">
                  {s.chord ? chordText(s.chord) : "–"}
                </span>
                {s.scale && (
                  <span className="truncate text-[0.7rem] font-medium opacity-80">
                    {scaleName(s.scale)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
