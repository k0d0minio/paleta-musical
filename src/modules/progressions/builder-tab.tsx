"use client";

import {
  DownloadIcon,
  EarIcon,
  PlusIcon,
  SendIcon,
  StarIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { audioEngine, stopRhythm, useRhythmPlayer } from "@/audio";
import { useAppStore, type ProgressionItem } from "@/state";
import {
  CHORD_TYPE_IDS,
  PITCH_CLASSES,
  chordPitchClasses,
  detectChords,
  letterName,
  suggestNext,
  type ChordMatch,
  type ChordRef,
  type PitchClass,
} from "@/theory";
import { cn } from "@/ui/cn";
import { Button } from "@/ui/components/button";
import { SegmentedControl } from "@/ui/components/toggle-group";
import { toast } from "@/ui/components/toaster";
import { NoteChip } from "@/ui/music";
import { ChordEditor } from "./chord-editor";
import { ChordLabel, chordText } from "./chord-label";
import { ChordList } from "./chord-list";
import { ChordNotes } from "./chord-notes";
import { SelectField } from "./fields";
import { Library, SaveButton, ShareButton } from "./library-panel";
import { exportProgressionMidi } from "./midi-actions";
import { itemsToChords, playChordRef, toggleRhythm } from "./play";
import { PlayButton } from "./play-button";
import { RhythmControls } from "./rhythm-controls";
import {
  rhythmOptions,
  setProgressions,
  useBuilderItems,
  useProgressionsState,
} from "./state";
import { UndoRedo } from "./timeline";

export const BUILDER_SOURCE = "builder";

/** F105: up to 6 exact matches; with fewer than 3 exact, partial matches fill up to 3. */
export function builderResults(notes: readonly PitchClass[]): {
  results: ChordMatch[];
  exact: boolean;
} {
  const all = detectChords(notes);
  const exact = all.filter((m) => m.exact).slice(0, 6);
  if (exact.length >= 3) return { results: exact, exact: true };
  const partial = all.filter((m) => !m.exact).slice(0, 3 - exact.length);
  return { results: [...exact, ...partial], exact: exact.length > 0 };
}

const toRef = (m: ChordMatch): ChordRef => ({
  root: m.root,
  type: m.type,
  inversion: 0,
});

/** Construtor (F097–F130). */
export function BuilderTab() {
  const t = useTranslations("modules.progressions");
  const s = useProgressionsState();
  const items = useBuilderItems();
  const actions = useAppStore((st) => st.builderLineActions);
  const appendToTimeline = useAppStore((st) => st.timelineActions.append);
  const player = useRhythmPlayer();
  const playing = player.source === BUILDER_SOURCE;
  const [editing, setEditing] = useState<ProgressionItem | null>(null);
  const [notes, setNotes] = useState<PitchClass[]>([]);
  const [staged, setStaged] = useState<ChordRef | null>(null);

  const addChord = (chord: ChordRef) => {
    actions.append([{ chord }]);
  };

  const switchMode = (mode: "list" | "detect") => {
    setNotes([]); // F097
    setStaged(null);
    setProgressions({ builderMode: mode });
  };

  const chords = itemsToChords(items);
  const suggestions = suggestNext(chords);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,20rem)]">
        <section
          aria-labelledby="builder-input"
          className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4"
        >
          <h2 id="builder-input" className="sr-only">
            {t("builder.mode")}
          </h2>
          <SegmentedControl
            aria-label={t("builder.mode")}
            value={s.builderMode}
            onValueChange={switchMode}
            options={[
              { value: "list", label: t("builder.list") },
              { value: "detect", label: t("builder.detect") },
            ]}
          />
          {s.builderMode === "list" ? (
            <ListInput onAdd={addChord} />
          ) : (
            <DetectInput
              notes={notes}
              setNotes={setNotes}
              staged={staged}
              setStaged={setStaged}
              onConfirm={(chord) => {
                addChord(chord);
                setNotes([]);
                setStaged(null);
                playChordRef(chord);
              }}
            />
          )}
        </section>
        <ChordNotes />
      </div>

      <section
        aria-labelledby="builder-line"
        className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4"
        data-testid="builder"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="builder-line" className="text-lg font-semibold">
            {t("builder.line")}
          </h2>
          <UndoRedo />
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-fg-muted">{t("builder.lineEmpty")}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start gap-4">
              <PlayButton
                className="mt-5"
                playing={playing}
                playLabel={t("playProgression", { name: t("builder.line") })}
                stopLabel={t("stopProgression", { name: t("builder.line") })}
                onToggle={() =>
                  toggleRhythm(
                    BUILDER_SOURCE,
                    playing,
                    chords,
                    s.builderRhythm,
                    rhythmOptions(s, s.builderBpm),
                  )
                }
              />
              <RhythmControls
                idPrefix="builder"
                rhythm={s.builderRhythm}
                bpm={s.builderBpm}
                onRhythm={(r) => setProgressions({ builderRhythm: r })}
                onBpm={(b) => setProgressions({ builderBpm: b })}
              />
            </div>
            <ChordList
              items={items}
              actions={actions}
              source={BUILDER_SOURCE}
              label={t("builder.line")}
              onEdit={setEditing}
              withInversions
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  appendToTimeline(
                    items.map((i) => ({ chord: i.chord, tension: i.tension })),
                  );
                  toast.success(t("addedToTimeline", { count: items.length }));
                }}
              >
                <SendIcon aria-hidden />
                {t("builder.sendToTimeline")}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  // U38: the builder's own rhythm and BPM.
                  void exportProgressionMidi(
                    chords,
                    s.builderRhythm,
                    rhythmOptions(s, s.builderBpm),
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
              <SaveButton />
              <ShareButton />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  stopRhythm(BUILDER_SOURCE);
                  actions.clear();
                }}
              >
                <Trash2Icon aria-hidden />
                {t("builder.clear")}
              </Button>
            </div>
          </>
        )}
      </section>

      <section
        aria-labelledby="builder-suggestions"
        className="flex flex-col gap-3"
      >
        <h2 id="builder-suggestions" className="text-lg font-semibold">
          {t("builder.suggestions")}
        </h2>
        {suggestions.length === 0 ? (
          <p className="text-sm text-fg-muted">
            {t("builder.suggestionsEmpty")}
          </p>
        ) : (
          <ul
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
            data-testid="suggestions"
          >
            {suggestions.map((sug) => {
              const reason = sug.hint
                ? `${sug.label} · ${t(`hints.${sug.hint}` as "hints.jazz")}`
                : sug.label;
              return (
                <li key={`${sug.chord.root}-${sug.chord.type}`}>
                  <button
                    type="button"
                    aria-label={t("builder.addSuggestion", {
                      chord: chordText(sug.chord),
                      reason,
                    })}
                    onClick={() => {
                      // F129
                      playChordRef(sug.chord);
                      addChord(sug.chord);
                      setProgressions({
                        builderTonic: sug.chord.root,
                        builderType: sug.chord.type,
                      });
                    }}
                    className="flex min-h-11 w-full flex-col items-start gap-0.5 rounded-xl border border-border bg-surface p-2.5 text-left shadow-1 hover:bg-surface-2"
                  >
                    <ChordLabel chord={sug.chord} />
                    <span className="text-xs text-fg-muted">{reason}</span>
                    <span
                      className="flex"
                      aria-label={t("builder.rating", { value: sug.rating })}
                    >
                      {Array.from({ length: 5 }, (_, i) => (
                        <StarIcon
                          key={i}
                          aria-hidden
                          className={cn(
                            "size-3",
                            i < sug.rating
                              ? "fill-current text-fg"
                              : "text-fg-subtle",
                          )}
                        />
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Library />

      <ChordEditor
        chord={editing?.chord ?? null}
        onClose={() => setEditing(null)}
        onApply={(chord) => {
          if (editing) actions.replace(editing.id, chord);
          setEditing(null);
          playChordRef(chord);
        }}
      />
    </div>
  );
}

function ListInput({ onAdd }: { onAdd: (chord: ChordRef) => void }) {
  const t = useTranslations("modules.progressions");
  const tTypes = useTranslations("chordTypes");
  const s = useProgressionsState();
  const chord: ChordRef = {
    root: s.builderTonic,
    type: s.builderType,
    inversion: 0,
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span id="builder-tonic" className="text-xs font-medium text-fg-muted">
          {t("builder.tonic")}
        </span>
        <div
          role="group"
          aria-labelledby="builder-tonic"
          className="grid grid-cols-6 gap-1.5 sm:grid-cols-12"
        >
          {PITCH_CLASSES.map((pc) => (
            <NoteChip
              key={pc}
              pc={pc}
              size="sm"
              selected={pc === s.builderTonic}
              onPress={(p) => setProgressions({ builderTonic: p })}
            />
          ))}
        </div>
      </div>
      <SelectField
        label={t("builder.type")}
        value={s.builderType}
        testId="builder-type"
        options={CHORD_TYPE_IDS.map((id) => ({
          value: id,
          label: `${letterName(s.builderTonic)} · ${tTypes(id)}`,
        }))}
        onChange={(builderType) => setProgressions({ builderType })}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={() => {
            onAdd(chord);
            playChordRef(chord);
          }}
        >
          <PlusIcon aria-hidden />
          {t("builder.add")}
        </Button>
        <Button
          onClick={() => playChordRef(chord, 1.6)}
          aria-label={t("builder.previewChord", { chord: chordText(chord) })}
        >
          <EarIcon aria-hidden />
          {t("builder.preview")}
        </Button>
      </div>
    </div>
  );
}

function DetectInput({
  notes,
  setNotes,
  staged,
  setStaged,
  onConfirm,
}: {
  notes: PitchClass[];
  setNotes: (n: PitchClass[]) => void;
  staged: ChordRef | null;
  setStaged: (c: ChordRef | null) => void;
  onConfirm: (chord: ChordRef) => void;
}) {
  const t = useTranslations("modules.progressions");
  const octave = useAppStore((st) => st.global.octave);
  const toggle = (pc: PitchClass) => {
    if (notes.includes(pc)) setNotes(notes.filter((n) => n !== pc));
    else {
      audioEngine.playNote({ pc, octave }); // F102: adding plays, removing is silent.
      setNotes([...notes, pc]);
    }
  };
  const { results, exact } = builderResults(notes);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-fg-muted">{t("builder.detectHint")}</p>
      <div
        role="group"
        aria-label={t("builder.detectHint")}
        className="grid grid-cols-6 gap-1.5 sm:grid-cols-12"
      >
        {PITCH_CLASSES.map((pc) => (
          <NoteChip
            key={pc}
            pc={pc}
            size="sm"
            playsNote={false}
            selected={notes.includes(pc)}
            onPress={toggle}
          />
        ))}
      </div>
      {notes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-fg-muted">
            {t("builder.selected")}
          </span>
          {notes.map((pc) => (
            <button
              key={pc}
              type="button"
              onClick={() => toggle(pc)}
              aria-label={t("builder.removeNote", { note: letterName(pc) })}
              className="inline-flex min-h-9 items-center gap-1 rounded-full border border-border px-2 text-sm hover:bg-surface-2"
            >
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ background: `var(--note-${pc})` }}
              />
              {letterName(pc)}
              <XIcon className="size-3" aria-hidden />
            </button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setNotes([])}>
            {t("builder.clearNotes")}
          </Button>
        </div>
      )}
      {notes.length < 2 ? (
        <p className="text-sm text-fg-muted">{t("builder.needTwo")}</p>
      ) : results.length === 0 ? (
        <p role="status" className="text-sm font-medium">
          {t("builder.noMatch")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p role="status" className="text-xs font-medium text-fg-muted">
            {exact ? t("builder.exact") : t("builder.partial")}
          </p>
          <ul className="flex flex-col gap-1.5" data-testid="detect-results">
            {results.map((m) => {
              const ref = toRef(m);
              const name = chordText(ref);
              return (
                <li
                  key={`${m.root}-${m.type}`}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2"
                >
                  <ChordLabel chord={ref} />
                  <span className="flex flex-1 flex-wrap gap-1 text-xs">
                    {chordPitchClasses(m.root, m.type).map((pc) => (
                      <span
                        key={pc}
                        className={cn(
                          "rounded px-1",
                          notes.includes(pc)
                            ? "bg-surface-2 font-semibold text-fg"
                            : "text-fg-muted",
                        )}
                      >
                        {letterName(pc)}
                      </span>
                    ))}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={t("builder.previewChord", { chord: name })}
                    onClick={() => playChordRef(ref, 1.6)}
                  >
                    <EarIcon aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    aria-label={t("builder.stage", { chord: name })}
                    onClick={() => {
                      setStaged(ref);
                      playChordRef(ref);
                    }}
                  >
                    <PlusIcon aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {staged && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-2 rounded-lg bg-accent-soft p-2 text-sm"
        >
          <span className="flex-1">
            {t("builder.staging", { chord: chordText(staged) })}
          </span>
          <Button size="sm" variant="primary" onClick={() => onConfirm(staged)}>
            {t("builder.confirm")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setStaged(null)}>
            {t("builder.cancel")}
          </Button>
        </div>
      )}
    </div>
  );
}
