import { fromMidi, toMidi, type Note } from "./pitch";

/**
 * R9: the 12 rhythms. One pattern definition per rhythm drives audio and MIDI
 * (fixes U31): event times and lengths are in beats, each event carries the
 * audio volume (per voice) and the MIDI velocity.
 *
 * Where the original audio and MIDI columns differ (U31), the one definition
 * takes the MIDI grid, so audio and file match the BPM: Balada has 2 beats
 * per chord (upper voices at 0.4 beat), Loop has 1 beat per chord. Swing feel
 * and strum speed apply to both.
 */
export const RHYTHM_IDS = [
  "simples",
  "arpejo",
  "arpejo-down",
  "arpejo-ud",
  "swing",
  "ballad",
  "funk",
  "strum",
  "bossa",
  "waltz",
  "half",
  "loop",
] as const;

export type RhythmId = (typeof RHYTHM_IDS)[number];

export function isRhythmId(value: unknown): value is RhythmId {
  return (
    typeof value === "string" &&
    (RHYTHM_IDS as readonly string[]).includes(value)
  );
}

export const ARPEGGIO_RHYTHMS: readonly RhythmId[] = [
  "arpejo",
  "arpejo-down",
  "arpejo-ud",
];

export interface RhythmOptions {
  readonly bpm: number;
  /** F077: long-beat share of the swing pair, 0.5–0.75. */
  readonly swing: number;
  /** F078: delay between strummed strings, ms. */
  readonly strumMs: number;
  /** F079: repetitions of the whole progression (Loop), 1–8. */
  readonly repeats: number;
  /** F080 / U05: time between arpeggio notes, ms; null follows the BPM (½ beat). */
  readonly arpNoteMs: number | null;
}

export const RHYTHM_DEFAULTS: RhythmOptions = {
  bpm: 90,
  swing: 0.67,
  strumMs: 40,
  repeats: 1,
  arpNoteMs: null,
};

export const BPM_MIN = 40;
export const BPM_MAX = 220;

export interface RhythmEvent {
  readonly beat: number;
  readonly durationBeats: number;
  readonly notes: readonly Note[];
  /** Audio volume per voice. */
  readonly volume: number;
  /** MIDI velocity, 1–127. */
  readonly velocity: number;
  /** How long the notes are marked as sounding, in beats. */
  readonly markBeats: number;
  /** Index of the chord in the input list. */
  readonly chordIndex: number;
  /** True for the first event of a chord slot (the chord that sounds changes). */
  readonly first: boolean;
}

export interface RhythmRender {
  readonly events: readonly RhythmEvent[];
  /** The end of the last slot, in beats. */
  readonly totalBeats: number;
}

export function beatsToSeconds(beats: number, bpm: number): number {
  return (beats * 60) / bpm;
}

export function secondsToBeats(seconds: number, bpm: number): number {
  return (seconds * bpm) / 60;
}

/** F080: the arpeggio note speed that follows the BPM (½ beat), ms. */
export function autoArpNoteMs(bpm: number): number {
  return Math.round(60000 / bpm / 2);
}

const shift = (note: Note, semitones: number): Note =>
  fromMidi(toMidi(note) + semitones);

function split(notes: readonly Note[]) {
  const sorted = [...notes].sort((a, b) => toMidi(a) - toMidi(b));
  const [bass, ...upper] = sorted;
  return { sorted, bass, upper };
}

type Emit = (e: Omit<RhythmEvent, "chordIndex" | "first">) => void;

/** One chord slot: emits its events from beat 0 and returns its length in beats. */
type SlotFn = (notes: readonly Note[], o: RhythmOptions, emit: Emit) => number;

function arpeggio(
  order: (sorted: Note[]) => Note[],
  volume: number,
  velocity: number,
  dur: number,
): SlotFn {
  return (notes, o, emit) => {
    const step =
      o.arpNoteMs === null ? 0.5 : secondsToBeats(o.arpNoteMs / 1000, o.bpm);
    const seq = order(split(notes).sorted);
    seq.forEach((n, i) =>
      emit({
        beat: i * step,
        durationBeats: dur * step,
        notes: [n],
        volume,
        velocity,
        markBeats: 0.8 * step,
      }),
    );
    return seq.length * step;
  };
}

const block =
  (slot: number, dur: number, mark: number, velocity = 90): SlotFn =>
  (notes, _o, emit) => {
    emit({
      beat: 0,
      durationBeats: dur,
      notes,
      volume: 0.18,
      velocity,
      markBeats: mark,
    });
    return slot;
  };

const SLOTS: Record<RhythmId, SlotFn> = {
  simples: block(1, 0.85, 0.75),
  loop: block(1, 0.85, 0.75),
  half: block(2, 1.8, 1.6),
  // Arpeggio durations are relative to the note step (½ beat by default).
  arpejo: arpeggio((s) => s, 0.26, 78, 1.1),
  "arpejo-down": arpeggio((s) => [...s].reverse(), 0.26, 78, 1.1),
  "arpejo-ud": arpeggio((s) => [...s, ...[...s].reverse()], 0.24, 75, 1),
  swing: (notes, o, emit) => {
    const { upper } = split(notes);
    emit({
      beat: 0,
      durationBeats: 1.5,
      notes,
      volume: 0.18,
      velocity: 88,
      markBeats: 0.9 * o.swing,
    });
    if (upper.length > 0)
      emit({
        beat: o.swing,
        durationBeats: 0.7 * (1 - o.swing),
        notes: upper.map((n) => shift(n, -12)),
        volume: 0.1,
        velocity: 45,
        markBeats: 0.9 * (1 - o.swing),
      });
    return 1;
  },
  ballad: (notes, _o, emit) => {
    const { bass, upper } = split(notes);
    if (bass)
      emit({
        beat: 0,
        durationBeats: 1.8,
        notes: [shift(bass, -12)],
        volume: 0.33,
        velocity: 85,
        markBeats: 1.4,
      });
    if (upper.length > 0)
      emit({
        beat: 0.4,
        durationBeats: 1.6,
        notes: upper,
        volume: 0.18,
        velocity: 70,
        markBeats: 1.4,
      });
    return 2;
  },
  funk: (notes, _o, emit) => {
    [0, 0.5, 1, 1.5].forEach((beat, i) =>
      emit({
        beat,
        durationBeats: i === 0 ? 0.4 : 0.2,
        notes,
        volume: i % 2 === 0 ? 0.22 : 0.1,
        velocity: i % 2 === 0 ? 88 : 45,
        markBeats: 0.45,
      }),
    );
    return 2;
  },
  strum: (notes, o, emit) => {
    const { sorted } = split(notes);
    const gap = secondsToBeats(o.strumMs / 1000, o.bpm);
    const directions = ["up", "up", "down", "up"] as const;
    directions.forEach((dir, stroke) => {
      const strings = dir === "up" ? sorted : [...sorted].reverse();
      strings.forEach((n, i) =>
        emit({
          beat: stroke + i * gap,
          durationBeats: 0.9,
          notes: [n],
          volume: 0.2,
          velocity: Math.max(55, 85 - 8 * i),
          markBeats: 0.8,
        }),
      );
    });
    return 4;
  },
  bossa: (notes, _o, emit) => {
    const { bass, upper } = split(notes);
    if (bass) {
      const low = shift(bass, -12);
      emit({
        beat: 0,
        durationBeats: 1.8,
        notes: [low],
        volume: 0.3,
        velocity: 82,
        markBeats: 1.8,
      });
      emit({
        beat: 1,
        durationBeats: 0.8,
        notes: [low],
        volume: 0.25,
        velocity: 75,
        markBeats: 0.8,
      });
    }
    if (upper.length > 0) {
      emit({
        beat: 0.4,
        durationBeats: 0.6,
        notes: upper,
        volume: 0.14,
        velocity: 65,
        markBeats: 0.6,
      });
      emit({
        beat: 1.5,
        durationBeats: 0.6,
        notes: upper,
        volume: 0.14,
        velocity: 62,
        markBeats: 0.5,
      });
    }
    return 2;
  },
  waltz: (notes, _o, emit) => {
    const { bass, upper } = split(notes);
    if (bass)
      emit({
        beat: 0,
        durationBeats: 1.2,
        notes: [shift(bass, -12)],
        volume: 0.32,
        velocity: 85,
        markBeats: 1.1,
      });
    if (upper.length > 0) {
      emit({
        beat: 1,
        durationBeats: 0.6,
        notes: upper,
        volume: 0.12,
        velocity: 60,
        markBeats: 0.6,
      });
      emit({
        beat: 2,
        durationBeats: 0.6,
        notes: upper,
        volume: 0.12,
        velocity: 55,
        markBeats: 0.6,
      });
    }
    return 3;
  },
};

/**
 * Renders a list of voiced chords (real notes, any order) with a rhythm into
 * timed events. An empty list renders nothing (F093).
 */
export function renderRhythm(
  rhythm: RhythmId,
  chords: readonly (readonly Note[])[],
  options: Partial<RhythmOptions> = {},
): RhythmRender {
  const o: RhythmOptions = { ...RHYTHM_DEFAULTS, ...options };
  const slot = SLOTS[rhythm];
  const repeats =
    rhythm === "loop" ? Math.min(8, Math.max(1, Math.round(o.repeats))) : 1;
  const events: RhythmEvent[] = [];
  let at = 0;
  for (let rep = 0; rep < repeats; rep++) {
    chords.forEach((notes, chordIndex) => {
      if (notes.length === 0) return;
      let first = true;
      const start = at;
      const length = slot(notes, o, (e) => {
        events.push({ ...e, beat: start + e.beat, chordIndex, first });
        first = false;
      });
      at += length;
    });
  }
  events.sort((a, b) => a.beat - b.beat);
  return { events, totalBeats: at };
}
