import { describe, expect, it } from "vitest";
import { alteredIntervals, alterationsFor } from "./altered";
import {
  CHORD_TYPE_IDS,
  chordPitchClasses,
  getChordType,
  type ChordTypeId,
} from "./chords";
import {
  DIATONIC_QUALITIES,
  diatonicChords,
  hasDiatonicChords,
  romanNumeral,
} from "./diatonic";
import { letterName } from "./names";
import { chordKeyContext } from "./spelling";
import type { PitchClass } from "./pitch";
import { compatibleScales, partialScales } from "./scale-match";
import { chordDegreeLabel, scaleDegreeLabel } from "./degrees";
import { SCALES, scalePitchClasses, type ScaleId } from "./scales";

const SYMBOL: Record<string, string> = {
  major: "",
  minor: "m",
  dim: "°",
  aug: "+",
};
const LETTERS = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
];
const names = (tonic: PitchClass, scale: ScaleId) =>
  diatonicChords(tonic, scale).map(
    (c) => `${LETTERS[c.root]}${SYMBOL[c.type]}`,
  );

describe("diatonic chords (R5, F044)", () => {
  it("has the 8 modal scales of R5 and no other", () => {
    expect(Object.keys(DIATONIC_QUALITIES).sort()).toEqual(
      [
        "major",
        "naturalMinor",
        "harmonicMinor",
        "dorian",
        "phrygian",
        "lydian",
        "mixolydian",
        "locrian",
      ].sort(),
    );
    const others = SCALES.filter((s) => !(s.id in DIATONIC_QUALITIES));
    for (const s of others) {
      expect(hasDiatonicChords(s.id)).toBe(false);
      expect(diatonicChords(0, s.id)).toEqual([]);
    }
  });

  it.each<[ScaleId, string[]]>([
    ["major", ["C", "Dm", "Em", "F", "G", "Am", "B°"]],
    ["naturalMinor", ["Cm", "D°", "D♯", "Fm", "Gm", "G♯", "A♯"]],
    ["harmonicMinor", ["Cm", "D°", "D♯+", "Fm", "G", "G♯", "B°"]],
    ["dorian", ["Cm", "Dm", "D♯", "F", "Gm", "A°", "A♯"]],
    ["phrygian", ["Cm", "C♯", "D♯", "Fm", "G°", "G♯", "A♯m"]],
    ["lydian", ["C", "D", "Em", "F♯°", "G", "Am", "Bm"]],
    ["mixolydian", ["C", "Dm", "E°", "F", "Gm", "Am", "A♯"]],
    ["locrian", ["C°", "C♯", "D♯m", "Fm", "F♯", "G♯", "A♯m"]],
  ])("gives the R5 triads of %s on C", (scale, expected) => {
    expect(names(0, scale)).toEqual(expected);
  });

  it("stacks thirds of the scale for every R5 entry on every tonic", () => {
    for (const scale of Object.keys(DIATONIC_QUALITIES) as ScaleId[]) {
      for (let tonic = 0; tonic < 12; tonic++) {
        const pcs = scalePitchClasses(tonic as PitchClass, scale);
        diatonicChords(tonic as PitchClass, scale).forEach((chord, i) => {
          const triad = [0, 2, 4].map((step) => pcs[(i + step) % 7]);
          expect(chordPitchClasses(chord.root, chord.type)).toEqual(triad);
        });
      }
    }
  });
});

describe("altered versions depend on the chord type (U10, F054)", () => {
  it('builds "CMenor(b9)" on the minor triad: a minor third, no major third', () => {
    const b9 = alteredIntervals("minor", "b9");
    expect(b9).toEqual([0, 3, 7, 13]);
    expect(b9).toContain(3);
    expect(b9).not.toContain(4);
    expect(b9).not.toContain(10);
  });

  it("alters the type's own intervals", () => {
    expect(alteredIntervals("dom7", "b9")).toEqual([0, 4, 7, 10, 13]);
    expect(alteredIntervals("dom7", "#11")).toEqual([0, 4, 7, 10, 18]);
    expect(alteredIntervals("dom7", "b13")).toEqual([0, 4, 7, 10, 20]);
    expect(alteredIntervals("dom7", "alt")).toEqual([0, 4, 6, 10, 13]);
    expect(alteredIntervals("maj7", "#11")).toEqual([0, 4, 7, 11, 18]);
    expect(alteredIntervals("dom9", "b9")).toEqual([0, 4, 7, 10, 13]);
    expect(alteredIntervals("m11", "#11")).toEqual([0, 3, 7, 10, 14, 18]);
    expect(alteredIntervals("dom13", "b13")).toEqual([0, 4, 7, 10, 14, 20]);
    expect(alteredIntervals("dom13", "alt")).toEqual([0, 4, 6, 10, 13, 20]);
  });

  it("does not offer an alteration the type cannot take", () => {
    const offered = (t: ChordTypeId) =>
      alterationsFor(t).map((a) => a.alteration);
    expect(offered("minor")).toEqual(["b9", "#11", "b13"]);
    expect(offered("dom7")).toEqual(["b9", "#11", "b13", "alt"]);
    expect(offered("dim")).toEqual(["b9", "b13"]);
    expect(offered("aug")).toEqual(["b9", "#11"]);
    expect(offered("sus2")).toEqual(["#11", "b13"]);
    expect(offered("sus4")).toEqual(["b9", "b13"]);
    expect(offered("dim7")).toEqual(["b9"]);
    expect(offered("dom7b9")).toEqual(["#11", "b13", "alt"]);
    expect(offered("six")).toEqual(["b9", "#11"]);
  });

  it("keeps the base of every type and never repeats an interval", () => {
    for (const type of CHORD_TYPE_IDS) {
      for (const { alteration, intervals } of alterationsFor(type)) {
        expect(new Set(intervals).size).toBe(intervals.length);
        expect(intervals[0]).toBe(0);
        if (alteration !== "alt") {
          const base = getChordType(type).intervals.filter(
            (iv) => iv < 12 && iv !== 0,
          );
          for (const iv of base) expect(intervals).toContain(iv);
        }
      }
    }
  });
});

const label = (m: { root: PitchClass; scale: ScaleId }) =>
  `${LETTERS[m.root]} ${m.scale}`;

describe("scale matches (F060, F064, F066)", () => {
  it("lists scales that hold every note, fewest notes first", () => {
    const result = compatibleScales([0, 4, 7]);
    expect(result).toHaveLength(8);
    expect(result[0] && label(result[0])).toBe("C majorPentatonic");
    for (let i = 1; i < result.length; i++)
      expect(result[i]?.pcs.length).toBeGreaterThanOrEqual(
        result[i - 1]?.pcs.length ?? 0,
      );
    for (const m of result)
      for (const n of [0, 4, 7]) expect(m.pcs).toContain(n);
  });

  it("gives the first 3 for Livre (F060)", () => {
    expect(compatibleScales([0, 2, 4, 5, 7, 9, 11], 3).map(label)).toEqual([
      "C major",
      "A naturalMinor",
      "D dorian",
    ]);
  });

  it("always finds the chromatic scale, so 12 notes give one result", () => {
    const all = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as PitchClass[];
    expect(compatibleScales(all).map(label)).toEqual(["C chromatic"]);
  });

  it("needs 3 notes for partial scales, holds ≥ 70 % rounded up and not all", () => {
    expect(partialScales([0, 1])).toEqual([]);
    // 3 notes: ceil(2.1) = 3 = all, so no partial scale can qualify.
    expect(partialScales([0, 1, 2])).toEqual([]);
    // 4 notes: ceil(2.8) = 3 of 4.
    const four = partialScales([0, 1, 4, 7]);
    expect(four.length).toBeGreaterThan(0);
    expect(four.length).toBeLessThanOrEqual(6);
    for (const m of four) {
      expect(m.matched).toBe(3);
      expect(m.total).toBe(4);
    }
    // 10 notes: 70 % is exactly 7 (no float error).
    const ten = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as PitchClass[];
    for (const m of partialScales(ten)) {
      expect(m.matched).toBeGreaterThanOrEqual(7);
      expect(m.matched).toBeLessThan(10);
    }
    expect(partialScales(ten).some((m) => m.matched === 7)).toBe(true);
  });

  it("puts the most matched notes first", () => {
    const result = partialScales([0, 2, 4, 5, 7, 9, 11, 1]);
    for (let i = 1; i < result.length; i++)
      expect(result[i]?.matched).toBeLessThanOrEqual(
        result[i - 1]?.matched ?? 0,
      );
  });
});

describe("degree labels", () => {
  it("labels scale degrees from the tonic", () => {
    expect(scaleDegreeLabel(3, 0, "naturalMinor")).toBe("♭3");
    expect(scaleDegreeLabel(4, 0, "naturalMinor")).toBeNull();
    expect(scaleDegreeLabel(11, 5, "lydian")).toBe("♯4");
    expect(scaleDegreeLabel(6, 0, "blues")).toBe("♭5");
    expect(scaleDegreeLabel(2, 2, "dorian")).toBe("1");
  });
  it("labels chord tones with extensions", () => {
    expect(chordDegreeLabel(2, 0, "dom9")).toBe("9");
    expect(chordDegreeLabel(1, 0, "dom7b9")).toBe("♭9");
    expect(chordDegreeLabel(10, 0, "dom7")).toBe("♭7");
    expect(chordDegreeLabel(5, 0, "m11")).toBe("11");
    expect(chordDegreeLabel(1, 0, "major")).toBeNull();
  });
});

describe("spelling by key", () => {
  it("spells chords in a key that holds their notes", () => {
    const letters = (root: PitchClass, type: ChordTypeId) =>
      chordPitchClasses(root, type).map((pc) =>
        letterName(pc, "key", chordKeyContext(root, type)),
      );
    expect(letters(0, "min7")).toEqual(["C", "E♭", "G", "B♭"]);
    expect(letters(0, "dom7")).toEqual(["C", "E", "G", "B♭"]);
    expect(letters(5, "major")).toEqual(["F", "A", "C"]);
    expect(letters(0, "halfDim")).toEqual(["C", "E♭", "G♭", "B♭"]);
  });
  it("spells B♭ in F major (scale key)", () => {
    expect(letterName(10, "key", { tonic: 5, scale: "major" })).toBe("B♭");
  });
  it("gives Roman numerals by quality", () => {
    expect(romanNumeral(0, "major")).toBe("I");
    expect(romanNumeral(1, "minor")).toBe("ii");
    expect(romanNumeral(6, "dim")).toBe("vii°");
    expect(romanNumeral(2, "aug")).toBe("III+");
  });
});
