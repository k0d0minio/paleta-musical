import { z } from "zod";

/**
 * The piano-roll data model (pure). Times are in seconds, pitches are MIDI
 * numbers. The roll shows MIDI 36–96 (F246, R19).
 */
export const PITCH_MIN = 36;
export const PITCH_MAX = 96;
export const PITCH_COUNT = PITCH_MAX - PITCH_MIN + 1;

export const BPM_MIN = 40;
export const BPM_MAX = 300;
export const BPM_STEP = 5;

/** F253, F255: the shortest note a resize or a draw gives. */
export const MIN_NOTE_SECONDS = 0.05;
/** F255: a drawn note has velocity 90. */
export const DRAW_VELOCITY = 90;

export interface RollNote {
  readonly id: string;
  /** MIDI 36–96. */
  readonly midi: number;
  /** Seconds from the start, ≥ 0. */
  readonly start: number;
  /** Seconds, > 0. */
  readonly duration: number;
  /** 1–127. */
  readonly velocity: number;
}

/** A note without an id (detector and capture output). */
export type RawNote = Omit<RollNote, "id">;

export const TOOLS = ["select", "draw", "erase"] as const;
export type Tool = (typeof TOOLS)[number];

export const PLAY_MODES = ["audio", "piano"] as const;
export type PlayMode = (typeof PLAY_MODES)[number];

export const MIC_MODES = ["mono", "poly"] as const;
export type MicMode = (typeof MIC_MODES)[number];

/** U22: the quantize grid is a setting. "t" = triplet. */
export const GRIDS = ["1/4", "1/8", "1/16", "1/32", "1/8t", "1/16t"] as const;
export type Grid = (typeof GRIDS)[number];

/**
 * The part of the roll that is in the undo history (`modules.analyse.roll`):
 * every edit of notes, the BPM and the duration.
 */
export interface RollDoc {
  readonly notes: readonly RollNote[];
  readonly bpm: number;
  /** Seconds: the length of the roll (F239, F264). */
  readonly duration: number;
}

/** Roll settings, not in the undo history (`modules.analyse.rollSettings`). */
export interface RollSettings {
  readonly tool: Tool;
  readonly heatmap: boolean;
  readonly playMode: PlayMode;
  readonly grid: Grid;
  readonly micMode: MicMode;
}

/** R2 defaults. */
export const DEFAULT_DOC: RollDoc = { notes: [], bpm: 120, duration: 10 };
export const DEFAULT_SETTINGS: RollSettings = {
  tool: "select",
  heatmap: true,
  playMode: "audio",
  grid: "1/16",
  micMode: "mono",
};

const noteSchema = z.object({
  id: z.string().min(1),
  midi: z.number().int().min(PITCH_MIN).max(PITCH_MAX),
  start: z.number().min(0),
  duration: z.number().positive(),
  velocity: z.number().int().min(1).max(127),
});

export const docSchema = z.object({
  notes: z.array(noteSchema),
  bpm: z.number().min(BPM_MIN).max(BPM_MAX),
  duration: z.number().positive(),
});

export const settingsSchema = z.object({
  tool: z.enum(TOOLS),
  heatmap: z.boolean(),
  playMode: z.enum(PLAY_MODES),
  grid: z.enum(GRIDS),
  micMode: z.enum(MIC_MODES),
});

/** Reads the stored doc; invalid or missing data gives the defaults. */
export function parseDoc(value: unknown): RollDoc {
  const parsed = docSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_DOC;
}

export function parseSettings(value: unknown): RollSettings {
  const parsed = settingsSchema.partial().safeParse(value);
  return parsed.success
    ? { ...DEFAULT_SETTINGS, ...stripUndefined(parsed.data) }
    : DEFAULT_SETTINGS;
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

export function clampBpm(bpm: number): number {
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));
}

export function clampPitch(midi: number): number {
  return Math.min(PITCH_MAX, Math.max(PITCH_MIN, Math.round(midi)));
}

export function clampVelocity(v: number): number {
  return Math.min(127, Math.max(1, Math.round(v)));
}

export function noteEnd(n: Pick<RollNote, "start" | "duration">): number {
  return n.start + n.duration;
}

let counter = 0;
/** A note id, unique in the session. */
export function noteId(): string {
  counter += 1;
  return `n${Date.now().toString(36)}${counter.toString(36)}`;
}

export function withIds(notes: readonly RawNote[]): RollNote[] {
  return notes.map((n) => ({ ...n, id: noteId() }));
}

/** Sorted by start, then pitch (stable order for keyboard selection). */
export function sortNotes(notes: readonly RollNote[]): RollNote[] {
  return [...notes].sort((a, b) => a.start - b.start || a.midi - b.midi);
}
