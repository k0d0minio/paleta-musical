import {
  DRAW_VELOCITY,
  MIN_NOTE_SECONDS,
  clampPitch,
  clampVelocity,
  noteEnd,
  noteId,
  type Grid,
  type RawNote,
  type RollNote,
} from "./model";

/**
 * Pure edit operations of the roll. Each one returns a new array; the caller
 * writes it to the store once per gesture, so each gesture is one undo step.
 */

// --- Quantize (F230, U22) ----------------------------------------------------

/** Grid step in seconds: a whole note is 4 beats; triplets are 2/3 of the straight value. */
export function gridStepSeconds(grid: Grid, bpm: number): number {
  const beat = 60 / bpm;
  const triplet = grid.endsWith("t");
  const denominator = Number(grid.slice(2).replace("t", ""));
  const straight = (beat * 4) / denominator;
  return triplet ? (straight * 2) / 3 : straight;
}

export function snap(t: number, step: number): number {
  return Math.round(t / step) * step;
}

/**
 * F230: every start snaps to the grid and every end to the grid, with a
 * minimum length of half a grid step. Only the given ids, or all notes.
 */
export function quantize(
  notes: readonly RollNote[],
  grid: Grid,
  bpm: number,
  ids?: ReadonlySet<string>,
): RollNote[] {
  const step = gridStepSeconds(grid, bpm);
  return notes.map((n) => {
    if (ids && !ids.has(n.id)) return n;
    const start = Math.max(0, snap(n.start, step));
    const end = snap(noteEnd(n), step);
    const duration = Math.max(step / 2, end - start);
    return { ...n, start, duration };
  });
}

// --- Move, resize, draw, erase (F252–F256) ------------------------------------

/**
 * F252: moves the notes in time (not before 0) and pitch (inside 36–96). The
 * whole group keeps its shape: the delta is limited by the note that hits a
 * limit first.
 */
export function moveNotes(
  notes: readonly RollNote[],
  ids: ReadonlySet<string>,
  dt: number,
  dPitch: number,
): RollNote[] {
  const moving = notes.filter((n) => ids.has(n.id));
  if (moving.length === 0) return [...notes];
  const minStart = Math.min(...moving.map((n) => n.start));
  const minPitch = Math.min(...moving.map((n) => n.midi));
  const maxPitch = Math.max(...moving.map((n) => n.midi));
  const safeDt = Math.max(dt, -minStart);
  const safeDp = Math.min(
    Math.max(Math.round(dPitch), clampPitch(-Infinity) - minPitch),
    clampPitch(Infinity) - maxPitch,
  );
  return notes.map((n) =>
    ids.has(n.id)
      ? { ...n, start: n.start + safeDt, midi: n.midi + safeDp }
      : n,
  );
}

/** F253, F255: sets the end of the notes (each keeps a minimum of 0.05 s). */
export function resizeNotes(
  notes: readonly RollNote[],
  ids: ReadonlySet<string>,
  dDuration: number,
): RollNote[] {
  return notes.map((n) =>
    ids.has(n.id)
      ? { ...n, duration: Math.max(MIN_NOTE_SECONDS, n.duration + dDuration) }
      : n,
  );
}

/** F255: a new note, half a beat long, velocity 90. */
export function drawNote(midi: number, start: number, bpm: number): RollNote {
  return {
    id: noteId(),
    midi: clampPitch(midi),
    start: Math.max(0, start),
    duration: Math.max(MIN_NOTE_SECONDS, 30 / bpm),
    velocity: DRAW_VELOCITY,
  };
}

export function removeNotes(
  notes: readonly RollNote[],
  ids: ReadonlySet<string>,
): RollNote[] {
  return notes.filter((n) => !ids.has(n.id));
}

export function setVelocity(
  notes: readonly RollNote[],
  ids: ReadonlySet<string>,
  velocity: number,
): RollNote[] {
  const v = clampVelocity(velocity);
  return notes.map((n) => (ids.has(n.id) ? { ...n, velocity: v } : n));
}

// --- Hit testing --------------------------------------------------------------

/** The topmost note at (t, midi): the last one in draw order. */
export function noteAt(
  notes: readonly RollNote[],
  t: number,
  midi: number,
): RollNote | null {
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i];
    if (n && n.midi === midi && t >= n.start && t <= noteEnd(n)) return n;
  }
  return null;
}

/** True when t is in the resize handle at the end of the note. */
export function isOnEnd(note: RollNote, t: number, handle: number): boolean {
  const end = noteEnd(note);
  const width = Math.min(handle, note.duration / 3);
  return t >= end - width && t <= end + handle / 2;
}

/** Ids of the notes that touch the box (time range × pitch range, inclusive). */
export function notesInBox(
  notes: readonly RollNote[],
  t0: number,
  t1: number,
  p0: number,
  p1: number,
): Set<string> {
  const [ta, tb] = t0 < t1 ? [t0, t1] : [t1, t0];
  const [pa, pb] = p0 < p1 ? [p0, p1] : [p1, p0];
  return new Set(
    notes
      .filter(
        (n) =>
          n.midi >= pa && n.midi <= pb && noteEnd(n) >= ta && n.start <= tb,
      )
      .map((n) => n.id),
  );
}

/** F261: ids of every note of a pitch class. */
export function notesOfPitchClass(
  notes: readonly RollNote[],
  pc: number,
): Set<string> {
  return new Set(notes.filter((n) => n.midi % 12 === pc).map((n) => n.id));
}

// --- Clipboard ----------------------------------------------------------------

/** Copies the notes as raw notes with times relative to the first start. */
export function copyNotes(
  notes: readonly RollNote[],
  ids: ReadonlySet<string>,
): RawNote[] {
  const picked = notes.filter((n) => ids.has(n.id));
  if (picked.length === 0) return [];
  const first = Math.min(...picked.map((n) => n.start));
  return picked.map(({ midi, start, duration, velocity }) => ({
    midi,
    start: start - first,
    duration,
    velocity,
  }));
}

/** Pastes clipboard notes at time `at`; returns the new notes (with new ids). */
export function pasteNotes(clip: readonly RawNote[], at: number): RollNote[] {
  return clip.map((n) => ({
    ...n,
    id: noteId(),
    start: Math.max(0, at + n.start),
  }));
}

// --- Summary and keyboard selection -------------------------------------------

/** F261: per pitch class, its count, most frequent first. */
export function pitchClassSummary(
  notes: readonly RollNote[],
): { pc: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const n of notes)
    counts.set(n.midi % 12, (counts.get(n.midi % 12) ?? 0) + 1);
  return [...counts.entries()]
    .map(([pc, count]) => ({ pc, count }))
    .sort((a, b) => b.count - a.count || a.pc - b.pc);
}

/** F262: the distinct pitch classes, ascending. */
export function distinctPitchClasses(notes: readonly RollNote[]): number[] {
  return [...new Set(notes.map((n) => n.midi % 12))].sort((a, b) => a - b);
}

/** The next (or previous) note in time order after the current one, for keyboard selection. */
export function stepSelection(
  notes: readonly RollNote[],
  currentId: string | null,
  direction: 1 | -1,
): RollNote | null {
  const sorted = [...notes].sort(
    (a, b) => a.start - b.start || a.midi - b.midi,
  );
  if (sorted.length === 0) return null;
  const index = sorted.findIndex((n) => n.id === currentId);
  if (index === -1)
    return direction === 1 ? (sorted[0] ?? null) : (sorted.at(-1) ?? null);
  const next = Math.min(sorted.length - 1, Math.max(0, index + direction));
  return sorted[next] ?? null;
}

/** The latest note end (0 with no notes). */
export function lastNoteEnd(notes: readonly RollNote[]): number {
  return notes.reduce((max, n) => Math.max(max, noteEnd(n)), 0);
}
