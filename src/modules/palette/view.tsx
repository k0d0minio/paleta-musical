"use client";

import { GuitarIcon, HashIcon, MusicIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { audioEngine, NOTE_MARK_SECONDS } from "@/audio";
import { useInputNotes } from "@/input";
import { useOctave } from "@/state";
import {
  CHORD_TYPE_IDS,
  PITCH_CLASSES,
  SCALE_IDS,
  chordDegreeLabel,
  chordKeyContext,
  chordPitchClasses,
  getChordType,
  guitarVoicing,
  realizeAscending,
  scaleDegreeLabel,
  scalePitchClasses,
  voiceChord,
  type KeyContext,
  type PitchClass,
} from "@/theory";
import { Kbd } from "@/ui/components/kbd";
import { SegmentedControl } from "@/ui/components/toggle-group";
import { ModulePage } from "@/ui/module-page";
import { GuitarDiagram, KeyboardView, StaffView } from "@/ui/music";
import { ChordPanel } from "./chord-panel";
import { OptionToggle, SelectField, TensionField } from "./controls";
import { useNoteText, useTheoryNames } from "./labels";
import { NoteGrid, type NoteMarks } from "./note-grid";
import { PaletteParams } from "./params";
import { ScalePanel } from "./scale-panel";
import { DetectPanel, FreePanel } from "./selection-panels";
import { TonicPicker } from "./tonic-picker";
import {
  PALETTE_MODES,
  getPaletteState,
  setPalette,
  toggleNote,
  usePaletteState,
  type PaletteMode,
} from "./state";
import { TENSION_MARK_DELAY_MS, isTense, useDebounced } from "./tension";

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

/** The Paleta module (F027–F067): Escala, Acorde, Livre and Detetar modes. */
export function PaletteView() {
  const t = useTranslations("modules.palette");
  const state = usePaletteState();
  const octave = useOctave();
  const { letter, name } = useNoteText();
  const names = useTheoryNames();
  const { mode, tonic, scale, chordType } = state;

  // The slider value while it moves; the store gets it on commit.
  const [liveTension, setLiveTension] = useState<number | null>(null);
  const tension = liveTension ?? state.tension;
  const tense = isTense(tension);
  // F038: the palette tension marks follow 80 ms after the last change.
  const tenseMarks = useDebounced(tense, TENSION_MARK_DELAY_MS);

  // F031, F056, F061: every source (pointer, QWERTY) plays the note; in
  // Livre and Detetar it also toggles the note in the selection.
  useInputNotes({
    noteOn: ({ note }) => {
      audioEngine.playNote(note, { markSeconds: NOTE_MARK_SECONDS });
      const current = getPaletteState();
      if (current.mode === "free")
        setPalette({ freeNotes: toggleNote(current.freeNotes, note.pc) });
      else if (current.mode === "detect")
        setPalette({ detectNotes: toggleNote(current.detectNotes, note.pc) });
    },
  });

  // Esc clears the selection (the shell also stops the sound).
  useHotkeys("escape", () => {
    const current = getPaletteState();
    if (current.mode === "free") setPalette({ freeNotes: [] });
    if (current.mode === "detect") setPalette({ detectNotes: [] });
  });

  const keyContext: KeyContext = useMemo(
    () =>
      mode === "chord" ? chordKeyContext(tonic, chordType) : { tonic, scale },
    [mode, tonic, chordType, scale],
  );

  const scalePcs = useMemo(
    () => scalePitchClasses(tonic, scale),
    [tonic, scale],
  );
  const chordPcs = useMemo(
    () => chordPitchClasses(tonic, chordType),
    [tonic, chordType],
  );
  const selection = useMemo(
    () =>
      mode === "free"
        ? state.freeNotes
        : mode === "detect"
          ? state.detectNotes
          : [],
    [mode, state.freeNotes, state.detectNotes],
  );

  const marks: NoteMarks = useMemo(() => {
    if (mode === "scale") {
      const inSet = new Set(scalePcs);
      return {
        inSet,
        tension: tenseMarks
          ? new Set(PITCH_CLASSES.filter((pc) => !inSet.has(pc)))
          : EMPTY,
        selected: null,
        degree: state.showDegrees
          ? (pc) => scaleDegreeLabel(pc, tonic, scale)
          : undefined,
      };
    }
    if (mode === "chord")
      return {
        inSet: new Set(chordPcs),
        tension: EMPTY,
        selected: null,
        degree: state.showDegrees
          ? (pc) => chordDegreeLabel(pc, tonic, chordType)
          : undefined,
      };
    return {
      inSet: null,
      tension: EMPTY,
      selected: new Set(selection),
      degree: undefined,
    };
  }, [
    mode,
    scalePcs,
    chordPcs,
    tenseMarks,
    selection,
    state.showDegrees,
    tonic,
    scale,
    chordType,
  ]);

  const shown: readonly PitchClass[] =
    mode === "scale" ? scalePcs : mode === "chord" ? chordPcs : selection;

  const staffNotes = useMemo(() => {
    const notes =
      mode === "chord"
        ? voiceChord({ root: tonic, type: chordType, inversion: 0 }, octave)
        : realizeAscending(
            mode === "scale" ? [...scalePcs, tonic] : selection,
            octave,
          );
    return notes.map((note) => ({ note, letter: letter(note.pc, keyContext) }));
  }, [mode, tonic, chordType, octave, scalePcs, selection, letter, keyContext]);

  const voicing = mode === "chord" ? guitarVoicing(tonic, chordType) : null;

  const modeLabels: Record<PaletteMode, string> = {
    scale: t("modes.scale"),
    chord: t("modes.chord"),
    free: t("modes.free"),
    detect: t("modes.detect"),
  };

  return (
    <ModulePage title={t("title")} description={t("description")}>
      <Suspense fallback={null}>
        <PaletteParams />
      </Suspense>

      <SegmentedControl
        aria-label={t("modeLabel")}
        value={mode}
        onValueChange={(m) => setPalette({ mode: m })}
        options={PALETTE_MODES.map((m) => ({ value: m, label: modeLabels[m] }))}
        className="sm:max-w-xl"
      />

      {mode !== "free" && mode !== "detect" && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-1 sm:p-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-fg-muted">
              {t("tonic")}
            </span>
            <TonicPicker
              value={tonic}
              keyContext={keyContext}
              label={t("tonic")}
              onChange={(pc) => setPalette({ tonic: pc })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {mode === "scale" ? (
              <SelectField
                label={t("scale")}
                value={scale}
                onChange={(s) => setPalette({ scale: s })}
                options={SCALE_IDS.map((id) => ({
                  value: id,
                  label: names.scale(id),
                }))}
              />
            ) : (
              <SelectField
                label={t("chordType")}
                value={chordType}
                onChange={(c) => setPalette({ chordType: c })}
                options={CHORD_TYPE_IDS.map((id) => ({
                  value: id,
                  label: `${letter(tonic, chordKeyContext(tonic, id))}${getChordType(id).symbol} · ${names.chordType(id)}`,
                }))}
              />
            )}
            <TensionField
              value={tension}
              onChange={setLiveTension}
              onCommit={(v) => {
                setPalette({ tension: v });
                setLiveTension(null);
              }}
            />
          </div>
        </div>
      )}

      <NoteGrid marks={marks} keyContext={keyContext} label={t("notesLabel")} />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <OptionToggle
            pressed={state.showDegrees}
            onChange={(v) => setPalette({ showDegrees: v })}
            icon={<HashIcon aria-hidden />}
          >
            {t("showDegrees")}
          </OptionToggle>
          <OptionToggle
            pressed={state.showStaff}
            onChange={(v) => setPalette({ showStaff: v })}
            icon={<MusicIcon aria-hidden />}
          >
            {t("showStaff")}
          </OptionToggle>
          {mode === "chord" && voicing && (
            <OptionToggle
              pressed={state.showGuitar}
              onChange={(v) => setPalette({ showGuitar: v })}
              icon={<GuitarIcon aria-hidden />}
            >
              {t("showGuitar")}
            </OptionToggle>
          )}
        </div>
        <KeyboardView
          marked={shown}
          root={mode === "scale" || mode === "chord" ? tonic : null}
          label={t("keyboardLabel", {
            notes: shown.length
              ? shown.map((pc) => name(pc, keyContext)).join(", ")
              : t("keyboardNone"),
          })}
        />
        {(state.showStaff ||
          (mode === "chord" && state.showGuitar && voicing)) && (
          <div className="flex flex-col items-start gap-3 sm:flex-row">
            {state.showStaff && (
              <StaffView
                notes={staffNotes}
                chord={mode === "chord"}
                label={t("staffLabel", {
                  notes: staffNotes.length
                    ? staffNotes.map((n) => n.letter).join(", ")
                    : t("keyboardNone"),
                })}
                loadingLabel={t("staffLoading")}
                errorLabel={t("staffError")}
                className="flex-1"
              />
            )}
            {mode === "chord" && state.showGuitar && voicing && (
              <GuitarDiagram
                voicing={voicing}
                letter={(pc) => letter(pc, keyContext)}
                label={t("guitarLabel", {
                  chord: names.chordSymbol(tonic, chordType, keyContext),
                  frets: voicing.frets
                    .map((f) => (f === null ? "x" : f))
                    .join(" "),
                })}
              />
            )}
          </div>
        )}
      </div>

      {mode === "scale" && (
        <ScalePanel state={state} tense={tense} keyContext={keyContext} />
      )}
      {mode === "chord" && (
        <ChordPanel state={state} tense={tense} keyContext={keyContext} />
      )}
      {mode === "free" && <FreePanel notes={state.freeNotes} />}
      {mode === "detect" && <DetectPanel notes={state.detectNotes} />}

      <p className="hidden text-sm text-fg-muted sm:block">
        {t.rich("keyboardHint", {
          keys: () => (
            <span className="inline-flex flex-wrap gap-0.5 align-middle">
              {QWERTY.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          ),
          down: () => <Kbd>Z</Kbd>,
          up: () => <Kbd>X</Kbd>,
          esc: () => <Kbd>Esc</Kbd>,
        })}
      </p>
    </ModulePage>
  );
}
