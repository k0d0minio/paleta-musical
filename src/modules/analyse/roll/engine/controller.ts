"use client";

import { audioEngine, markSounding, type PatternEvent } from "@/audio";
import { readSmf, writeSmf } from "@/midi";
import { shareOrDownload, type ShareResult } from "@/platform";
import { fromMidi, toPitchClass } from "@/theory";
import { getDecodedFile } from "../../decoded-file";
import { lastNoteEnd } from "../lib/edit";
import {
  fitView,
  followLive,
  followPlayhead,
  type View,
} from "../lib/geometry";
import { R20 } from "../lib/live";
import { withIds, type MicMode, type RollNote } from "../lib/model";
import { ROLL_MIDI_FILE, rollToSong, songToRoll } from "../lib/smf";
import {
  STOPPED,
  ended,
  home as homeState,
  isValidLoop,
  loopPass,
  play as playState,
  position,
  seek as seekState,
  stop as stopState,
  type Loop,
} from "../lib/transport";
import { getRollDoc, getRollSettings, setRollDoc } from "../state";
import { startCapture, type CaptureDeps } from "./capture";
import { runDetection } from "./detector";
import { session } from "./session";

/**
 * The roll's side effects: file analysis (R19 worker), microphone capture
 * (R20), playback (F233–F235, U18) and MIDI import/export (R21). The view
 * calls these; every one of them can be stopped by `stopEverything` (U17).
 */

// --- File analysis (F237–F240) ----------------------------------------------

let progressReset: ReturnType<typeof setTimeout> | null = null;

export async function analyseFile(): Promise<void> {
  const file = getDecodedFile();
  if (!file) {
    session.set({ status: { key: "noBuffer", error: true } });
    return;
  }
  if (session.get().busy) return;
  stopPlayback();
  if (progressReset) clearTimeout(progressReset);
  session.set({ busy: "analysing", progress: 5, status: { key: "analysing" } });
  try {
    const result = await runDetection(file.buffer, (pct) =>
      session.set({
        progress: pct,
        status: { key: "processing", values: { pct: Math.round(pct) } },
      }),
    );
    setRollDoc({
      notes: withIds(result.notes),
      bpm: result.bpm,
      duration: Math.max(0.5, result.duration),
    });
    session.set({
      busy: null,
      progress: 100,
      heatmap: result.heatmap,
      selection: new Set(),
      transport: STOPPED,
      view: { start: 0, end: Math.max(0.5, Math.min(20, result.duration)) },
      status: {
        key: "detected",
        values: { n: result.notes.length, bpm: result.bpm },
      },
    });
    progressReset = setTimeout(() => session.set({ progress: null }), 1500);
  } catch (error) {
    session.set({
      busy: null,
      progress: null,
      status: {
        key: "analysisError",
        values: { message: errorMessage(error) },
        error: true,
      },
    });
  }
}

// --- Microphone capture (F241–F245, U20) ---------------------------------------

const lastMark = new Map<number, number>();

/** Starts a capture. The view asks for confirmation first when the roll has notes (U20). */
export async function startMic(
  mode: MicMode,
  deps?: CaptureDeps,
): Promise<void> {
  if (session.get().busy) return;
  stopPlayback();
  session.set({ busy: "requesting", status: { key: "micRequest" } });
  try {
    const capture = await startCapture(
      mode,
      (loud, t) => onCaptureFrame(loud, t),
      deps,
    );
    // Leaving or stop-all during the permission prompt: release at once.
    if (session.get().busy !== "requesting") {
      await capture.stop();
      return;
    }
    lastMark.clear();
    session.set({
      busy: "capturing",
      capture,
      heatmap: capture.analysis.heatmap,
      selection: new Set(),
      transport: STOPPED,
      view: { start: 0, end: R20.initialSeconds },
      status: { key: "capturing" },
    });
  } catch (error) {
    session.set({
      busy: null,
      status: {
        key: "micDenied",
        values: { message: errorMessage(error) },
        error: true,
      },
    });
  }
}

function onCaptureFrame(loud: readonly number[], t: number): void {
  // F244: louder than 50 % → marked as sounding on the palette (200 ms).
  const now = performance.now();
  const marks = loud.filter((pc) => now - (lastMark.get(pc) ?? 0) > 150);
  for (const pc of marks) lastMark.set(pc, now);
  if (marks.length > 0)
    markSounding(marks.map(toPitchClass), R20.paletteMarkSeconds);
  const view = session.get().view;
  if (view) {
    const next = followLive(view, t);
    if (next !== view) session.set({ view: next });
  }
}

/** F245: stops the capture; the captured notes replace the roll (one undo step). */
export async function stopMic(): Promise<number> {
  const s = session.get();
  if (s.busy === "requesting") {
    session.set({ busy: null, status: { key: "initial" } });
    return 0;
  }
  const capture = s.capture;
  if (!capture) return 0;
  session.set({ capture: null, busy: null });
  const t = capture.now();
  await capture.stop();
  const notes = withIds(capture.analysis.notes());
  const end = lastNoteEnd(notes);
  setRollDoc({
    notes,
    duration: notes.length > 0 ? end + 1 : Math.max(t, 1),
  });
  session.set({
    status: { key: "captureStopped", values: { n: notes.length } },
    view: fitView(notes.length > 0 ? end + 1 : Math.max(t, 1)),
  });
  return notes.length;
}

// --- Playback (F232–F236, U18) --------------------------------------------------

interface Playing {
  readonly mode: "audio" | "piano";
  readonly end: number;
  readonly from: number;
  source?: AudioBufferSourceNode;
  cancel?: () => void;
  frame: number;
  pass: number;
}

let playing: Playing | null = null;
let internalStop = false;

export type PlayResult = "playing" | "noAudio" | "noNotes" | "unavailable";

function clock(): number {
  return audioEngine.context?.currentTime ?? 0;
}

function activeLoop(from: number): Loop | null {
  const loop = session.get().loop;
  return isValidLoop(loop) && from < loop.end ? loop : null;
}

/** Plays from the playhead (U18) in the chosen mode (F232, F233). Call it in a gesture. */
export async function play(): Promise<PlayResult> {
  if (session.get().transport.playing) return "playing";
  const { playMode } = getRollSettings();
  const doc = getRollDoc();
  const file = getDecodedFile();
  if (playMode === "audio" && !file) return "noAudio";
  if (playMode === "piano" && doc.notes.length === 0) return "noNotes";
  audioEngine.unlock();
  const ctx = audioEngine.context;
  if (!ctx) return "unavailable";

  // F234: playback ends at the end of the duration (piano: + 200 ms).
  const end =
    playMode === "audio" && file ? file.buffer.duration : doc.duration + 0.2;
  let from = session.get().transport.playhead;
  if (from >= end - 0.01) from = 0;
  const loop = activeLoop(from);
  const current: Playing = { mode: playMode, end, from, frame: 0, pass: 0 };
  playing = current;

  if (playMode === "audio" && file) {
    const source = ctx.createBufferSource();
    source.buffer = file.buffer;
    if (loop) {
      source.loop = true;
      source.loopStart = loop.start;
      source.loopEnd = Math.min(loop.end, file.buffer.duration);
    }
    source.connect(ctx.destination);
    source.start(ctx.currentTime, from);
    current.source = source;
  } else {
    current.cancel = await audioEngine.schedule(
      pianoEvents(doc.notes, from, loop ? loop.end : Infinity),
    );
    if (playing !== current) {
      current.cancel();
      return "playing";
    }
  }
  session.set({
    transport: playState({ ...STOPPED, playhead: from }, clock()),
  });
  current.frame = requestAnimationFrame(tick);
  return "playing";
}

/** F233: piano mode notes as engine events, from `from` up to `until`. */
export function pianoEvents(
  notes: readonly RollNote[],
  from: number,
  until: number,
): PatternEvent[] {
  return notes
    .filter((n) => n.start >= from - 1e-6 && n.start < until)
    .map((n) => ({
      at: n.start - from,
      kind: "note" as const,
      notes: [fromMidi(n.midi)],
      options: {
        duration: n.duration * 1.1,
        volume: (n.velocity / 127) * 0.38,
        attack: 0.01,
        markSeconds: Math.min(0.8, n.duration),
      },
    }));
}

function tick(): void {
  const current = playing;
  const s = session.get();
  if (!current || !s.transport.playing) return;
  const now = clock();
  const loop = activeLoop(current.from);
  const pos = position(s.transport, now, loop);
  if (!loop && pos >= current.end) {
    stopPlayback(true);
    return;
  }
  if (loop && current.mode === "piano") {
    const pass = loopPass(s.transport, now, loop);
    if (pass > current.pass) {
      current.pass = pass;
      void audioEngine
        .schedule(pianoEvents(getRollDoc().notes, loop.start, loop.end))
        .then((cancel) => {
          if (playing === current) current.cancel = cancel;
          else cancel();
        });
    }
  }
  if (s.view) {
    const next = followPlayhead(s.view, pos, getRollDoc().duration);
    if (next !== s.view) session.set({ view: next });
  }
  current.frame = requestAnimationFrame(tick);
}

/** U18: stop keeps the playhead (or goes to 0 at the natural end). */
export function stopPlayback(atEnd = false): void {
  const current = playing;
  playing = null;
  const s = session.get();
  if (current) {
    cancelAnimationFrame(current.frame);
    if (current.source) {
      try {
        current.source.stop();
        current.source.disconnect();
      } catch {
        // Already stopped.
      }
    }
    if (current.cancel) {
      current.cancel();
      // Ringing piano voices stop too; our own stop handler ignores this call.
      internalStop = true;
      try {
        audioEngine.stopAll();
      } finally {
        internalStop = false;
      }
    }
  }
  if (!s.transport.playing) return;
  session.set({
    transport: atEnd
      ? ended()
      : stopState(s.transport, clock(), activeLoop(s.transport.playhead)),
  });
}

/** U18: home goes to 0 (and plays on from 0 when playing). */
export function home(): void {
  seek(0);
}

/** Moves the playhead; while playing, playback continues from there. */
export function seek(t: number): void {
  const s = session.get();
  if (s.transport.playing) {
    stopPlayback();
    session.set({ transport: seekState(session.get().transport, t, clock()) });
    void play();
  } else {
    session.set({ transport: homeOrSeek(s.transport, t) });
  }
}

function homeOrSeek(state: typeof STOPPED, t: number) {
  return t === 0 ? homeState(state, clock()) : seekState(state, t, clock());
}

export function setLoop(loop: Loop | null): void {
  const wasPlaying = session.get().transport.playing;
  if (wasPlaying) stopPlayback();
  session.set({ loop });
  if (wasPlaying) void play();
}

/** The playhead now (for the canvas, each frame). */
export function currentPosition(): number {
  const s = session.get();
  return position(
    s.transport,
    clock(),
    playing ? activeLoop(playing.from) : null,
  );
}

// --- Stop everything (U17) ------------------------------------------------------

/** Stops playback and the microphone. Leaving the roll or the module calls it. */
export async function stopEverything(): Promise<void> {
  stopPlayback();
  const s = session.get();
  if (s.busy === "requesting") session.set({ busy: null });
  if (s.capture) await stopMic();
}

/** Registers the stop-all handler (Esc, module switch). Returns the unregister function. */
export function registerStopAll(): () => void {
  return audioEngine.onStopAll(() => {
    if (!internalStop) void stopEverything();
  });
}

// --- MIDI (F263, R21, import) ----------------------------------------------------

export type ExportResult =
  { kind: "empty" } | { kind: ShareResult; n: number; bpm: number };

export async function exportMidi(): Promise<ExportResult> {
  const { notes, bpm } = getRollDoc();
  if (notes.length === 0) return { kind: "empty" };
  const bytes = writeSmf(rollToSong(notes, bpm));
  const kind = await shareOrDownload(
    bytes as Uint8Array<ArrayBuffer>,
    ROLL_MIDI_FILE,
    "audio/midi",
  );
  return { kind, n: notes.length, bpm };
}

/** Imports a .mid file into the roll (replaces the notes; one undo step). */
export async function importMidi(file: Blob): Promise<void> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { notes, bpm } = songToRoll(readSmf(bytes));
    stopPlayback();
    const end = lastNoteEnd(notes);
    setRollDoc({ notes, bpm, duration: Math.max(1, end + 1) });
    session.set({
      heatmap: null,
      selection: new Set(),
      transport: STOPPED,
      view: fitView(Math.max(1, end + 1)),
      status: { key: "imported", values: { n: notes.length, bpm } },
    });
  } catch (error) {
    session.set({
      status: {
        key: "importError",
        values: { message: errorMessage(error) },
        error: true,
      },
    });
  }
}

// --- Helpers ----------------------------------------------------------------------

export function errorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const { message, name } = error as { message?: unknown; name?: unknown };
    if (typeof message === "string" && message) return message;
    if (typeof name === "string" && name) return name;
  }
  return String(error);
}

/** The view window to show: the stored one, or the whole duration. */
export function viewOrFit(view: View | null, duration: number): View {
  return view ?? fitView(duration);
}
