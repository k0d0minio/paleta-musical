"use client";

import { BlocksIcon, ListPlusIcon, PlayIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, type CSSProperties } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { audioEngine, NOTE_MARK_SECONDS } from "@/audio";
import { useInputNotes } from "@/input";
import {
  NoteDot,
  NoteGrid,
  Panel,
  SPACING,
  SubHeading,
  parseNotesParam,
  playChordRef,
  playSequence,
  toggleNote,
  useApplyLinkParams,
  useNoteText,
  useTheoryNames,
  type NoteMarks,
} from "@/modules/palette";
import { useGoTo } from "@/nav";
import { useAppStore } from "@/state";
import {
  chordKeyContext,
  detectChords,
  slashChord,
  splitMatches,
  tonalChordNames,
  type ChordMatch,
  type PitchClass,
} from "@/theory";
import { cn } from "@/ui/cn";
import { Button } from "@/ui/components/button";
import { Kbd } from "@/ui/components/kbd";
import { toast } from "@/ui/components/toaster";
import { ModulePage } from "@/ui/module-page";
import { ChordName } from "@/ui/music";
import { addToBuilder, addToTimeline } from "./actions";
import { getChordsState, setChordNotes, useChordsState } from "./state";

const QWERTY = [
  "A",
  "W",
  "S",
  "E",
  "D",
  "F",
  "T",
  "G",
  "Y",
  "H",
  "U",
  "J",
  "K",
];
const EMPTY = new Set<PitchClass>();

function ChordsParams() {
  useApplyLinkParams((params) => {
    const notes = params.get("notes");
    if (notes !== null) setChordNotes(parseNotesParam(notes));
  });
  return null;
}

/** One result (F178): the chord, its notes (the chosen notes marked), play, add to the timeline or the builder. */
function ChordResult({
  match,
  bass,
  selected,
}: {
  match: ChordMatch;
  bass: PitchClass;
  selected: ReadonlySet<PitchClass>;
}) {
  const t = useTranslations("modules.chords");
  const goTo = useGoTo();
  const { letter } = useNoteText();
  const names = useTheoryNames();
  const key = chordKeyContext(match.root, match.type);
  const slash = slashChord(match, bass);
  const chord = { root: match.root, type: match.type, inversion: 0 };
  const symbol =
    names.chordSymbol(match.root, match.type, key) +
    (slash.bass !== null ? `/${letter(slash.bass, key)}` : "");

  return (
    <li
      data-exact={match.exact}
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between",
        match.exact
          ? "border-border-strong shadow-1"
          : "border-dashed border-border",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <button
          type="button"
          aria-label={t("choose", { chord: symbol })}
          onClick={() => {
            // F179: choosing the result plays it and sets the last chord.
            playChordRef(slash.chord);
            useAppStore.getState().setLastChord(match.pcs, chord);
          }}
          className="-m-1 flex flex-wrap items-baseline gap-x-2 rounded-lg p-1 text-left hover:bg-surface-2"
        >
          <span className="inline-flex items-baseline text-lg">
            <ChordName chord={chord} keyContext={key} />
            {slash.bass !== null && (
              <span className="font-semibold">/{letter(slash.bass, key)}</span>
            )}
          </span>
          <span className="text-sm text-fg-muted">
            {names.chordType(match.type)}
            {slash.bass !== null &&
              ` · ${t("inversion", { n: slash.chord.inversion })}`}
          </span>
        </button>
        <span className="flex flex-wrap gap-1.5">
          {match.pcs.map((pc) => {
            const chosen = selected.has(pc);
            return (
              <span
                key={pc}
                data-chosen={chosen}
                style={{ "--note": `var(--note-${pc})` } as CSSProperties}
                className={cn(
                  "inline-flex h-7 min-w-9 items-center justify-center rounded-md px-2 text-sm font-semibold",
                  chosen
                    ? "bg-(--note) text-note-on"
                    : "border border-dashed border-(--note) text-fg-muted",
                )}
              >
                {letter(pc, key)}
                <span className="sr-only">
                  {" "}
                  ({chosen ? t("chosenNote") : t("partialNote")})
                </span>
              </span>
            );
          })}
        </span>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        <Button
          size="icon"
          variant="ghost"
          aria-label={t("play", { chord: symbol })}
          onClick={() => playChordRef(slash.chord)}
        >
          <PlayIcon aria-hidden />
        </Button>
        <Button
          size="md"
          variant="secondary"
          aria-label={t("addToTimeline", { chord: symbol })}
          onClick={() => {
            addToTimeline(chord);
            toast.success(t("addedToTimeline", { chord: symbol }));
          }}
        >
          <ListPlusIcon aria-hidden />
          <span aria-hidden className="hidden sm:inline">
            {t("timeline")}
          </span>
        </Button>
        <Button
          size="md"
          variant="secondary"
          aria-label={t("addToBuilder", { chord: symbol })}
          onClick={() => addToBuilder(chord, goTo)}
        >
          <BlocksIcon aria-hidden />
          <span aria-hidden className="hidden sm:inline">
            {t("builder")}
          </span>
        </Button>
      </div>
    </li>
  );
}

/** The Acordes module (F170–F182): chord detection from notes (R10). */
export function ChordsView() {
  const t = useTranslations("modules.chords");
  const { notes } = useChordsState();
  const { name } = useNoteText();

  // F171: every source plays the note and toggles it in the selection.
  useInputNotes({
    noteOn: ({ note }) => {
      audioEngine.playNote(note, { markSeconds: NOTE_MARK_SECONDS });
      setChordNotes(toggleNote(getChordsState().notes, note.pc));
    },
  });
  useHotkeys("escape", () => setChordNotes([]));

  const selected = useMemo(() => new Set(notes), [notes]);
  const split = useMemo(() => splitMatches(detectChords(notes)), [notes]);
  const otherNames = useMemo(() => tonalChordNames(notes), [notes]);
  const bass = notes[0] ?? 0;
  const marks: NoteMarks = { inSet: null, tension: EMPTY, selected };

  return (
    <ModulePage title={t("title")} description={t("description")}>
      <Suspense fallback={null}>
        <ChordsParams />
      </Suspense>

      <NoteGrid marks={marks} label={t("notesLabel")} />

      <Panel
        labelledBy="chords-selected-title"
        title={t("selectedTitle")}
        actions={
          notes.length > 0 && (
            <>
              <Button
                variant="primary"
                onClick={() => playSequence(notes, SPACING.chords)}
              >
                <PlayIcon aria-hidden />
                {t("playNotes")}
              </Button>
              <Button onClick={() => setChordNotes([])}>
                <XIcon aria-hidden />
                {t("clear")}
              </Button>
            </>
          )
        }
      >
        {notes.length > 0 && (
          <ul
            aria-labelledby="chords-selected-title"
            className="flex flex-wrap gap-2"
          >
            {notes.map((pc) => (
              <li key={pc}>
                <button
                  type="button"
                  aria-label={t("removeNote", { note: name(pc) })}
                  onClick={() => setChordNotes(notes.filter((n) => n !== pc))}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface-2 pr-2 pl-3 text-sm font-medium hover:bg-border"
                >
                  <NoteDot pc={pc} />
                  {name(pc)}
                  <XIcon aria-hidden className="size-3.5 text-fg-muted" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div aria-live="polite" className="flex flex-col gap-4">
          {notes.length < 2 ? (
            <p className="text-sm text-fg-muted">{t("needTwo")}</p>
          ) : split.exact.length === 0 && split.partial.length === 0 ? (
            <div className="flex flex-col gap-1">
              <p className="font-medium">{t("noMatch")}</p>
              <p className="text-sm text-fg-muted">{t("noMatchHint")}</p>
            </div>
          ) : (
            otherNames.length > 0 && (
              <p className="text-sm text-fg-muted">
                {t("otherNames", { names: otherNames.join(" · ") })}
              </p>
            )
          )}
        </div>
      </Panel>

      {notes.length >= 2 && split.exact.length > 0 && (
        <section aria-labelledby="chords-exact" className="flex flex-col gap-2">
          <SubHeading id="chords-exact">
            {t("exactTitle", { count: split.exact.length })}
          </SubHeading>
          <ul aria-labelledby="chords-exact" className="flex flex-col gap-2">
            {split.exact.map((m) => (
              <ChordResult
                key={`${m.root}-${m.type}`}
                match={m}
                bass={bass}
                selected={selected}
              />
            ))}
          </ul>
        </section>
      )}
      {notes.length >= 2 && split.partial.length > 0 && (
        <section
          aria-labelledby="chords-partial"
          className="flex flex-col gap-2"
        >
          <SubHeading id="chords-partial">
            {t("partialTitle", { count: split.partial.length })}
          </SubHeading>
          <ul
            aria-labelledby="chords-partial"
            className="grid gap-2 lg:grid-cols-2"
          >
            {split.partial.map((m) => (
              <ChordResult
                key={`${m.root}-${m.type}`}
                match={m}
                bass={bass}
                selected={selected}
              />
            ))}
          </ul>
        </section>
      )}

      <p className="hidden text-sm text-fg-muted sm:block">
        {t.rich("keyboardHint", {
          keys: () => (
            <span className="inline-flex flex-wrap gap-0.5 align-middle">
              {QWERTY.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          ),
          esc: () => <Kbd>Esc</Kbd>,
        })}
      </p>
    </ModulePage>
  );
}
