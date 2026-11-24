import { describe, expect, it } from "vitest";
import {
  STYLE_IDS,
  STYLE_PROGRESSIONS,
  getChordType,
  letterName,
  progressionName,
  progressionsOfStyle,
  resolveNumeral,
  resolveProgression,
  romanScale,
  type ChordRef,
} from ".";

const symbol = (c: ChordRef) =>
  `${letterName(c.root)}${getChordType(c.type).symbol}`;

/** R7 in C major, written out by hand (independent of the code). */
const C_MAJOR: Record<string, string> = {
  I: "C",
  ii: "Dm",
  iii: "Em",
  IV: "F",
  V: "G",
  vi: "Am",
  vii: "Bm",
  i: "Cm",
  iv: "Fm",
  v: "Gm",
  bVII: "A♯",
  bVI: "G♯",
  bIII: "D♯",
  bII: "C♯",
  "#IV": "F♯",
  VII: "B",
  III: "E",
  VI: "A",
  II: "D",
  I7: "C7",
  IV7: "F7",
  V7: "G7",
};
const TENSION = new Set([
  "bVII",
  "bVI",
  "bIII",
  "bII",
  "#IV",
  "VII",
  "III",
  "VI",
  "II",
  "I7",
  "IV7",
  "V7",
]);

/** One full progression per style, by hand. */
const FIRST: Record<string, string[]> = {
  trap: ["Cm", "A♯", "G♯", "A♯"],
  hipHop: ["Cm", "G♯", "D♯", "A♯"],
  pop: ["C", "G", "Am", "F"],
  jazz: ["Dm", "G", "C"],
  blues: ["C", "C", "C", "C", "F", "F", "C", "C", "G", "F", "C", "G"],
  classical: ["C", "F", "G", "C"],
  flamenco: ["Cm", "A♯", "G♯", "G"],
  cinematic: ["C", "A♯", "G♯", "A♯"],
  rnb: ["Cm", "A♯", "G♯", "A♯"],
  house: ["Cm", "G♯", "A♯", "Cm"],
  latin: ["Cm", "G", "Cm", "F"],
  metal: ["Cm", "G♯", "A♯", "Cm"],
};
const COUNTS: Record<string, number> = {
  trap: 9,
  hipHop: 10,
  pop: 10,
  jazz: 10,
  blues: 6,
  classical: 7,
  flamenco: 5,
  cinematic: 8,
  rnb: 6,
  house: 6,
  latin: 6,
  metal: 6,
};

describe("R6 style progressions", () => {
  it("has 12 styles and 89 progressions", () => {
    expect(STYLE_IDS).toHaveLength(12);
    expect(STYLE_PROGRESSIONS).toHaveLength(89);
    expect(new Set(STYLE_PROGRESSIONS.map((p) => p.id)).size).toBe(89);
  });

  it.each(STYLE_IDS.map((s) => [s]))(
    "style %s resolves by R7 in C major",
    (style) => {
      const list = progressionsOfStyle(style);
      expect(list).toHaveLength(COUNTS[style] ?? -1);
      for (const p of list) {
        const { chords, parentScale } = resolveProgression(
          p.numerals,
          0,
          "major",
        );
        expect(parentScale).toBeNull();
        expect(chords.map((c) => symbol(c.chord))).toEqual(
          p.numerals.map((n) => C_MAJOR[n]),
        );
        expect(chords.map((c) => c.tension)).toEqual(
          p.numerals.map((n) => TENSION.has(n)),
        );
      }
      const first = list[0];
      expect(
        first &&
          resolveProgression(first.numerals, 0, "major").chords.map((c) =>
            symbol(c.chord),
          ),
      ).toEqual(FIRST[style]);
    },
  );

  it("names a progression by its numerals; 12 compassos has its own name", () => {
    expect(
      progressionName(
        STYLE_PROGRESSIONS[0] ?? { id: "", style: "trap", numerals: [] },
      ),
    ).toBe("i–bVII–bVI–bVII");
    expect(
      STYLE_PROGRESSIONS.find((p) => p.nameKey === "twelveBar")?.numerals,
    ).toHaveLength(12);
  });
});

describe("R7 Roman numerals", () => {
  it("uses the selected scale for the degrees", () => {
    expect(symbol(resolveNumeral("iii", 2, "dorian").chord)).toBe("Fm");
    expect(symbol(resolveNumeral("V", 9, "naturalMinor").chord)).toBe("E");
  });

  it("adds a 7th with the 7 suffix only when the degree exists", () => {
    expect(resolveNumeral("ii7", 0, "major").chord.type).toBe("min7");
    expect(resolveNumeral("vii7", 0, "majorPentatonic").chord).toEqual({
      root: 9,
      type: "minor",
      inversion: 0,
    });
  });

  it("U35: a non-heptatonic scale resolves against its parent scale", () => {
    expect(romanScale("chromatic")).toEqual({ scale: "major", parent: true });
    expect(romanScale("minorPentatonic")).toEqual({
      scale: "naturalMinor",
      parent: true,
    });
    expect(romanScale("blues")).toEqual({
      scale: "naturalMinor",
      parent: true,
    });
    expect(romanScale("bebopDominant")).toEqual({
      scale: "major",
      parent: true,
    });
    expect(romanScale("dorian")).toEqual({ scale: "dorian", parent: false });
    // Old behaviour: "ii" on the chromatic scale was C♯. Now it is D minor.
    const { chords, parentScale } = resolveProgression(
      ["ii", "V", "I"],
      0,
      "chromatic",
    );
    expect(parentScale).toBe("major");
    expect(chords.map((c) => symbol(c.chord))).toEqual(["Dm", "G", "C"]);
  });
});
