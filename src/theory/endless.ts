import { getChordType, type ChordRef, type ChordTypeId } from "./chords";
import { toMidi, toPitchClass, type Note, type PitchClass } from "./pitch";
import { weightedIndex, type RandomSource } from "./random";
import { getScale, type ScaleId } from "./scales";
import { inversionCount, voiceChord } from "./voicing";

/**
 * R13: the 9 styles of the Endless generator, in the app's order. Display
 * names and descriptions come from the messages (`modules.endless.styles`).
 */
export const ENDLESS_STYLES = [
  {
    id: "trap",
    weights: [4, 1, 1, 2, 1, 3, 2, 1],
    tension: 0.35,
    bpm: 140,
    minor: true,
  },
  {
    id: "hipHop",
    weights: [3, 2, 2, 3, 2, 4, 1, 1],
    tension: 0.2,
    bpm: 90,
    minor: true,
  },
  {
    id: "relaxing",
    weights: [5, 2, 3, 2, 1, 1, 1, 1],
    tension: 0.05,
    bpm: 72,
    minor: false,
  },
  {
    id: "dramatic",
    weights: [3, 3, 2, 3, 2, 2, 1, 1],
    tension: 0.25,
    bpm: 90,
    minor: false,
  },
  {
    id: "jazz",
    weights: [2, 4, 4, 2, 3, 3, 1, 1],
    tension: 0.15,
    bpm: 110,
    minor: false,
  },
  {
    id: "epic",
    weights: [4, 2, 2, 3, 2, 2, 3, 1],
    tension: 0.3,
    bpm: 80,
    minor: false,
  },
  {
    id: "dark",
    weights: [5, 1, 2, 3, 1, 2, 4, 1],
    tension: 0.45,
    bpm: 120,
    minor: true,
  },
  {
    id: "soul",
    weights: [3, 3, 2, 4, 2, 3, 1, 1],
    tension: 0.1,
    bpm: 85,
    minor: false,
  },
  {
    id: "random",
    weights: [1, 1, 1, 1, 1, 1, 1, 1],
    tension: 0.4,
    bpm: 100,
    minor: false,
  },
] as const satisfies readonly {
  id: string;
  weights: readonly number[];
  tension: number;
  bpm: number;
  minor: boolean;
}[];

export type EndlessStyleId = (typeof ENDLESS_STYLES)[number]["id"];

export interface EndlessStyle {
  readonly id: EndlessStyleId;
  readonly weights: readonly number[];
  readonly tension: number;
  readonly bpm: number;
  readonly minor: boolean;
}

export const ENDLESS_STYLE_IDS: readonly EndlessStyleId[] = ENDLESS_STYLES.map(
  (s) => s.id,
);

/** R2 defaults of the Endless module. */
export const ENDLESS_DEFAULTS = {
  key: 0 as PitchClass,
  scale: "naturalMinor" as ScaleId,
  style: "trap" as EndlessStyleId,
  bpm: 140,
} as const;

export const ENDLESS_BPM_MIN = 40;
export const ENDLESS_BPM_MAX = 220;

/** F160, F161: the queue starts with 16 chords and gets 8 more when fewer than 4 remain. */
export const QUEUE_START = 16;
export const QUEUE_REFILL_BELOW = 4;
export const QUEUE_REFILL_COUNT = 8;

/** F160: a chord sounds for 82 % of its slot; its notes are marked for 75 %. */
export const CHORD_SOUND_RATIO = 0.82;
export const CHORD_MARK_RATIO = 0.75;

/** The probability that a minor style forces a minor triad (R13). */
export const FORCED_MINOR_PROBABILITY = 0.8;

export function isEndlessStyleId(value: unknown): value is EndlessStyleId {
  return (
    typeof value === "string" &&
    (ENDLESS_STYLE_IDS as readonly string[]).includes(value)
  );
}

export function getEndlessStyle(id: EndlessStyleId): EndlessStyle {
  const style = ENDLESS_STYLES.find((s) => s.id === id);
  if (!style) throw new Error(`Unknown style: ${id}`);
  return style;
}

/** R13 and U11: a minor style always uses "Menor Natural". */
export function effectiveScale(style: EndlessStyleId, scale: ScaleId): ScaleId {
  return getEndlessStyle(style).minor ? "naturalMinor" : scale;
}

/** R13: one beat per chord for minor styles, else two. */
export function slotBeats(style: EndlessStyleId): number {
  return getEndlessStyle(style).minor ? 1 : 2;
}

export function slotSeconds(style: EndlessStyleId, bpm: number): number {
  return (slotBeats(style) * 60) / bpm;
}

export interface EndlessContext {
  readonly key: PitchClass;
  readonly scale: ScaleId;
  readonly style: EndlessStyleId;
}

/** One generated chord. `seventh` is the added interval 10 (the tension mark, F163). */
export interface GeneratedChord {
  readonly chord: ChordRef;
  /** The 0-based scale degree the chord was built on. */
  readonly degree: number;
  readonly seventh: boolean;
}

/** U12: a triad with an added 7th (interval 10) is its R4 seventh type, so its name has "7". */
const WITH_SEVENTH: Record<"major" | "minor" | "dim", ChordTypeId> = {
  major: "dom7",
  minor: "min7",
  dim: "halfDim",
};

/**
 * R13 chord rule (F168). Random draws, in this order: the degree, the forced
 * minor (minor styles only), the added 7th.
 */
export function generateChord(
  context: EndlessContext,
  random: RandomSource,
): GeneratedChord {
  const style = getEndlessStyle(context.style);
  const intervals = getScale(
    effectiveScale(context.style, context.scale),
  ).intervals;
  const size = Math.min(intervals.length, style.weights.length);
  const degree = weightedIndex(style.weights.slice(0, size), random);
  const forcedMinor = style.minor && random() < FORCED_MINOR_PROBABILITY;
  const triad: "major" | "minor" | "dim" =
    forcedMinor || degree === 1 || degree === 2 || degree === 5
      ? "minor"
      : degree === 6
        ? "dim"
        : "major";
  const seventh = random() < style.tension;
  return {
    chord: {
      root: toPitchClass(context.key + (intervals[degree] ?? 0)),
      type: seventh ? WITH_SEVENTH[triad] : triad,
      inversion: 0,
    },
    degree,
    seventh,
  };
}

export function generateChords(
  context: EndlessContext,
  random: RandomSource,
  count: number,
): GeneratedChord[] {
  return Array.from({ length: count }, () => generateChord(context, random));
}

/** F161: takes the next chord and refills the queue when fewer than 4 remain. */
export function takeFromQueue(
  queue: readonly GeneratedChord[],
  context: EndlessContext,
  random: RandomSource,
): { chord: GeneratedChord; queue: GeneratedChord[] } {
  let rest = [...queue];
  if (rest.length === 0) rest = generateChords(context, random, QUEUE_START);
  const [chord, ...remaining] = rest as [GeneratedChord, ...GeneratedChord[]];
  const next =
    remaining.length < QUEUE_REFILL_BELOW
      ? [...remaining, ...generateChords(context, random, QUEUE_REFILL_COUNT)]
      : remaining;
  return { chord, queue: next };
}

export interface Voiced {
  readonly inversion: number;
  readonly octave: number;
  readonly notes: Note[];
}

/**
 * Optional smooth voicing: the inversion and octave of `chord` with the least
 * movement from the previous chord. A small cost keeps the chord near the
 * chosen octave, so a long sequence does not drift up or down.
 */
export function smoothVoicing(
  previous: readonly Note[] | null,
  chord: ChordRef,
  octave: number,
): Voiced {
  const base = voiceChord({ ...chord, inversion: 0 }, octave);
  if (!previous || previous.length === 0)
    return { inversion: 0, octave, notes: base };
  const before = previous.map(toMidi);
  const centre = toMidi({ pc: 0, octave }) + 6;
  const count = inversionCount(getChordType(chord.type).intervals);
  let best: Voiced = { inversion: 0, octave, notes: base };
  let bestCost = Infinity;
  for (let inversion = 0; inversion < count; inversion++) {
    for (const o of [octave - 1, octave, octave + 1]) {
      if (o < 1 || o > 7) continue;
      const notes = voiceChord({ ...chord, inversion }, o);
      const midis = notes.map(toMidi);
      const movement = midis.reduce(
        (sum, m) => sum + Math.min(...before.map((b) => Math.abs(m - b))),
        0,
      );
      const mean = midis.reduce((a, b) => a + b, 0) / midis.length;
      const drift = Math.max(0, Math.abs(mean - centre) - 5);
      const cost = movement + drift;
      if (cost < bestCost) {
        bestCost = cost;
        best = { inversion, octave: o, notes };
      }
    }
  }
  return best;
}
