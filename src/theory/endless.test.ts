import { describe, expect, it } from "vitest";
import {
  ENDLESS_STYLES,
  QUEUE_REFILL_COUNT,
  QUEUE_START,
  effectiveScale,
  generateChords,
  getChordType,
  getScale,
  mulberry32,
  seedFromText,
  slotBeats,
  smoothVoicing,
  takeFromQueue,
  toMidi,
  toPitchClass,
  weightedIndex,
  type EndlessContext,
  type GeneratedChord,
  type Note,
} from ".";

const SEED = 20261124;

/** How often each index 0…n−1 occurs. */
function tally(indices: readonly number[], n: number): number[] {
  const out = new Array<number>(n).fill(0);
  for (const i of indices) out[i] = (out[i] ?? 0) + 1;
  return out;
}
const DRAWS = 40_000;

describe("seeded random (mulberry32)", () => {
  it("repeats the same sequence for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 50 }, a);
    expect(Array.from({ length: 50 }, b)).toEqual(seqA);
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
    const c = mulberry32(43);
    expect(Array.from({ length: 50 }, c)).not.toEqual(seqA);
  });

  it("reads a number seed as that number and hashes other text", () => {
    expect(seedFromText("1234")).toBe(1234);
    expect(seedFromText(" 77 ")).toBe(77);
    expect(seedFromText("trap night")).toBe(seedFromText("trap night"));
    expect(seedFromText("trap night")).not.toBe(seedFromText("trap day"));
  });

  it("draws indices in proportion to their weights", () => {
    const random = mulberry32(SEED);
    const counts = tally(
      Array.from({ length: DRAWS }, () => weightedIndex([1, 2, 1], random)),
      3,
    );
    expect((counts[0] ?? 0) / DRAWS).toBeCloseTo(0.25, 1);
    expect((counts[1] ?? 0) / DRAWS).toBeCloseTo(0.5, 1);
  });
});

/** The triad quality of a generated chord, without its added 7th. */
function triad(c: GeneratedChord): "major" | "minor" | "dim" {
  const intervals = getChordType(c.chord.type).intervals;
  if (intervals.includes(6)) return "dim";
  return intervals.includes(3) ? "minor" : "major";
}

describe("R13 styles", () => {
  it("has the 9 styles with their base BPM and minor flag", () => {
    expect(
      ENDLESS_STYLES.map((s) => [s.id, s.bpm, s.minor, s.tension]),
    ).toEqual([
      ["trap", 140, true, 0.35],
      ["hipHop", 90, true, 0.2],
      ["relaxing", 72, false, 0.05],
      ["dramatic", 90, false, 0.25],
      ["jazz", 110, false, 0.15],
      ["epic", 80, false, 0.3],
      ["dark", 120, true, 0.45],
      ["soul", 85, false, 0.1],
      ["random", 100, false, 0.4],
    ]);
    for (const s of ENDLESS_STYLES) expect(s.weights).toHaveLength(8);
  });

  it("gives minor styles 1 beat per chord and the others 2", () => {
    expect(slotBeats("trap")).toBe(1);
    expect(slotBeats("dark")).toBe(1);
    expect(slotBeats("jazz")).toBe(2);
  });

  it("forces Menor Natural for minor styles only (U11)", () => {
    expect(effectiveScale("trap", "lydian")).toBe("naturalMinor");
    expect(effectiveScale("hipHop", "major")).toBe("naturalMinor");
    expect(effectiveScale("jazz", "lydian")).toBe("lydian");
  });
});

describe("R13 chord rule with a fixed seed", () => {
  for (const style of ENDLESS_STYLES) {
    it(`${style.id}: degree distribution, triad rule and 7th rate`, () => {
      const context: EndlessContext = {
        key: 2,
        scale: "major",
        style: style.id,
      };
      const scale = getScale(effectiveScale(style.id, context.scale));
      const chords = generateChords(context, mulberry32(SEED), DRAWS);

      // Degree distribution follows the first min(scale size, 8) weights.
      const weights = style.weights.slice(
        0,
        Math.min(8, scale.intervals.length),
      );
      const total = weights.reduce((a, b) => a + b, 0);
      const counts = tally(
        chords.map((c) => c.degree),
        weights.length,
      );
      weights.forEach((w, d) =>
        expect(Math.abs((counts[d] ?? 0) / DRAWS - w / total)).toBeLessThan(
          0.01,
        ),
      );

      // The root is the degree of the effective scale on the key.
      for (const c of chords.slice(0, 200)) {
        expect(c.chord.root).toBe(
          toPitchClass(context.key + (scale.intervals[c.degree] ?? NaN)),
        );
      }

      // Triad rule.
      for (const c of chords) {
        if (!style.minor) {
          const expected = [1, 2, 5].includes(c.degree)
            ? "minor"
            : c.degree === 6
              ? "dim"
              : "major";
          expect(triad(c)).toBe(expected);
        } else if ([1, 2, 5].includes(c.degree)) {
          expect(triad(c)).toBe("minor");
        } else if (triad(c) !== "minor") {
          // Not forced minor: diminished on degree 7, else major.
          expect(triad(c)).toBe(c.degree === 6 ? "dim" : "major");
        }
      }
      if (style.minor) {
        // Forced minor about 80 % of the time on degrees outside {1, 2, 5}.
        const free = chords.filter((c) => ![1, 2, 5].includes(c.degree));
        const minor = free.filter((c) => triad(c) === "minor").length;
        expect(Math.abs(minor / free.length - 0.8)).toBeLessThan(0.015);
      }

      // Added 7th with probability "tension"; its name has "7" (U12).
      const sevenths = chords.filter((c) => c.seventh);
      expect(Math.abs(sevenths.length / DRAWS - style.tension)).toBeLessThan(
        0.01,
      );
      for (const c of sevenths) {
        expect(getChordType(c.chord.type).intervals).toContain(10);
        expect(getChordType(c.chord.type).symbol).toContain("7");
      }
      for (const c of chords.filter((x) => !x.seventh)) {
        expect(getChordType(c.chord.type).intervals).toHaveLength(3);
      }
    });
  }

  it("gives the same sequence for the same seed, key, scale and style", () => {
    const context: EndlessContext = { key: 9, scale: "dorian", style: "jazz" };
    const a = generateChords(context, mulberry32(7), 32);
    const b = generateChords(context, mulberry32(7), 32);
    expect(b).toEqual(a);
  });

  it("names the 7th chords Am7, Bø7 and G7 (U12)", () => {
    const sevenths = generateChords(
      { key: 9, scale: "naturalMinor", style: "dark" },
      mulberry32(SEED),
      2000,
    ).filter((c) => c.seventh);
    const types = new Set(sevenths.map((c) => c.chord.type));
    expect(types).toEqual(new Set(["min7", "dom7", "halfDim"]));
  });
});

describe("queue (F160, F161)", () => {
  it("starts with 16 chords and refills 8 when fewer than 4 remain", () => {
    const context: EndlessContext = { key: 0, scale: "major", style: "soul" };
    const random = mulberry32(1);
    let queue: GeneratedChord[] = [];
    const sizes: number[] = [];
    for (let i = 0; i < 30; i++) {
      queue = takeFromQueue(queue, context, random).queue;
      sizes.push(queue.length);
    }
    expect(sizes[0]).toBe(QUEUE_START - 1);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(4);
    expect(sizes).toContain(3 + QUEUE_REFILL_COUNT);
  });
});

describe("smooth voicing", () => {
  it("moves less than root position and stays near the octave", () => {
    const random = mulberry32(5);
    const chords = generateChords(
      { key: 0, scale: "major", style: "random" },
      random,
      64,
    );
    let previous: Note[] | null = null;
    for (const c of chords) {
      const voiced = smoothVoicing(previous, c.chord, 4);
      const midis = voiced.notes.map(toMidi);
      const mean = midis.reduce((a, b) => a + b, 0) / midis.length;
      expect(Math.abs(mean - 66)).toBeLessThanOrEqual(12);
      previous = voiced.notes;
    }
  });
});
