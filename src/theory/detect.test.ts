import { describe, expect, it } from "vitest";
import {
  builderMatches,
  detectChords,
  inversionForBass,
  slashChord,
  splitMatches,
  tonalChordNames,
  type ChordMatch,
} from "./detect";
import type { PitchClass } from "./pitch";

const short = (m: ChordMatch) => `${m.root}:${m.type}:${m.exact ? "x" : "p"}`;

describe("detectChords (R10)", () => {
  it("needs 2 or more distinct notes", () => {
    expect(detectChords([])).toEqual([]);
    expect(detectChords([0])).toEqual([]);
    expect(detectChords([0, 0, 12 as PitchClass])).toEqual([]);
  });

  it("finds C major exactly from C E G, in any order", () => {
    for (const notes of [
      [0, 4, 7],
      [7, 0, 4],
      [4, 7, 0],
    ] as PitchClass[][]) {
      const exact = detectChords(notes).filter((m) => m.exact);
      expect(exact.map(short)).toEqual(["0:major:x"]);
    }
  });

  it("lists exact matches first, then fewer intervals, then the root name A–G#", () => {
    // C E G A: C6 and Am7 are both exact with 4 intervals; A sorts before C.
    const result = detectChords([0, 4, 7, 9]);
    expect(result.filter((m) => m.exact).map(short)).toEqual([
      "9:min7:x",
      "0:six:x",
    ]);
    const firstPartial = result.findIndex((m) => !m.exact);
    expect(result.slice(firstPartial).every((m) => !m.exact)).toBe(true);
  });

  it("orders the C E G results exactly (hand-checked against R10)", () => {
    expect(detectChords([0, 4, 7]).map(short)).toEqual([
      "0:major:x",
      // 4 intervals: A before C; same root keeps the R4 order.
      "9:min7:p",
      "0:dom7:p",
      "0:maj7:p",
      "0:add9:p",
      "0:six:p",
      // 5 intervals: A, C, C, C, F.
      "9:m9:p",
      "0:dom9:p",
      "0:maj9:p",
      "0:dom7b9:p",
      "5:maj9:p",
      // 6 intervals: A, C, D.
      "9:m11:p",
      "0:dom13:p",
      "2:m11:p",
    ]);
  });

  it("keeps the R10 order for every 2- and 3-note selection", () => {
    const names = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    for (let a = 0; a < 12; a++)
      for (let b = a + 1; b < 12; b++)
        for (const c of [undefined, (b + 3) % 12]) {
          const notes = [a, b, c].filter(
            (n) => n !== undefined,
          ) as PitchClass[];
          const matches = detectChords(notes);
          for (let i = 1; i < matches.length; i++) {
            const x = matches[i - 1];
            const y = matches[i];
            if (!x || !y) continue;
            if (x.exact !== y.exact) {
              expect(x.exact).toBe(true);
              continue;
            }
            const [cx, cy] = [intervalCount(x), intervalCount(y)];
            expect(cx).toBeLessThanOrEqual(cy);
            if (cx === cy)
              expect(
                (names[x.root] ?? "").localeCompare(names[y.root] ?? "", "en"),
              ).toBeLessThanOrEqual(0);
          }
        }
  });

  it("names the exact matches of a 4-note chord: C E G B♭ is C7", () => {
    expect(
      detectChords([0, 4, 7, 10])
        .filter((m) => m.exact)
        .map(short),
    ).toEqual(["0:dom7:x"]);
  });

  it("finds the diminished seventh on all four roots", () => {
    expect(
      detectChords([0, 3, 6, 9])
        .filter((m) => m.exact)
        .map(short),
    ).toEqual(["9:dim7:x", "0:dim7:x", "3:dim7:x", "6:dim7:x"]);
  });

  it("returns no match for a cluster no type holds", () => {
    expect(detectChords([0, 1, 2])).toEqual([]);
  });
});

function intervalCount(m: ChordMatch): number {
  const counts: Record<string, number> = {
    major: 3,
    minor: 3,
    dim: 3,
    aug: 3,
    sus2: 3,
    sus4: 3,
    dom7: 4,
    maj7: 4,
    min7: 4,
    dim7: 4,
    add9: 4,
    mAdd9: 4,
    m6: 4,
    dom7sus4: 4,
    halfDim: 4,
    aug7: 4,
    six: 4,
    dom9: 5,
    m9: 5,
    maj9: 5,
    dom7b9: 5,
    sharp11: 5,
    dom13: 6,
    m11: 6,
  };
  return counts[m.type] ?? 0;
}

describe("splitMatches (F176, F177)", () => {
  it("keeps every exact match and caps the partial matches at 16", () => {
    const split = splitMatches(detectChords([0, 4]));
    expect(split.exact).toEqual([]);
    expect(split.partial).toHaveLength(16);
    expect(split.partialTotal).toBeGreaterThan(16);
    expect(split.partial[0]).toEqual(detectChords([0, 4])[0]);
  });
});

describe("builderMatches (F105)", () => {
  it("fills up to 3 results with partial matches when fewer than 3 are exact", () => {
    const result = builderMatches(detectChords([0, 4, 7]));
    expect(result).toHaveLength(3);
    expect(result[0]?.exact).toBe(true);
    expect(result.slice(1).every((m) => !m.exact)).toBe(true);
  });
  it("keeps up to 6 exact matches", () => {
    const result = builderMatches(detectChords([0, 3, 6, 9]));
    expect(result).toHaveLength(4);
    expect(result.every((m) => m.exact)).toBe(true);
  });
});

describe("slash chords and inversions", () => {
  it("gives the inversion that puts the bass lowest", () => {
    expect(inversionForBass(0, "major", 4)).toBe(1);
    expect(inversionForBass(0, "major", 7)).toBe(2);
    expect(inversionForBass(0, "dom7", 10)).toBe(3);
    expect(inversionForBass(0, "major", 2)).toBeNull();
  });
  it("names E G C as C/E in 1st inversion", () => {
    const [match] = detectChords([4, 7, 0]).filter((m) => m.exact);
    expect(match).toBeDefined();
    if (!match) return;
    expect(slashChord(match, 4)).toEqual({
      chord: { root: 0, type: "major", inversion: 1 },
      bass: 4,
    });
    expect(slashChord(match, 0).bass).toBeNull();
  });
  it("adds the tonal names, with the first note as the bass", () => {
    expect(tonalChordNames([4, 7, 0])).toContain("C/E");
    expect(tonalChordNames([0, 4, 7, 10])).toEqual(["C7"]);
  });
});
