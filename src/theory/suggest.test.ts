import { describe, expect, it } from "vitest";
import {
  CHORD_TYPE_IDS,
  detectChords,
  nameNotes,
  substitutionsFor,
  suggestNext,
  type ChordRef,
  type ChordTypeId,
} from ".";

const ch = (root: number, type: ChordTypeId, inversion = 0) =>
  ({ root, type, inversion }) as ChordRef;

describe("R11 suggestions", () => {
  it("U01: every suggestion keeps its own type (old: all major, same roots collapsed)", () => {
    const s = suggestNext([ch(0, "major")]);
    expect(s).toHaveLength(10);
    expect(s.every((x) => CHORD_TYPE_IDS.includes(x.chord.type))).toBe(true);
    expect(
      s.filter((x) => x.chord.root === 5).map((x) => x.chord.type),
    ).toEqual(["major", "maj7"]);
  });

  it("sorts by strength (stable) and keeps 10", () => {
    const s = suggestNext([ch(0, "major")]);
    expect(s.slice(0, 4).map((x) => x.label)).toEqual(["IV", "V", "vi", "V7"]);
    expect(s.map((x) => x.label)).not.toContain("Imaj7");
  });

  it("applies the bonuses when the line has 2 or more chords", () => {
    // G after C: the last root is a fifth above the previous root.
    const s = suggestNext([ch(0, "major"), ch(7, "major")]);
    const iv = s.find((x) => x.label === "IV");
    expect(iv?.strength).toBe(6.5);
    expect(iv?.chord.root).toBe(0);
    expect(s.find((x) => x.label === "V")?.strength).toBe(5.5);
    expect(s[0]?.label).toBe("IV");
  });

  it("uses the dom7 rules with negative offsets and caps the rating at 5", () => {
    const s = suggestNext([ch(7, "dom7")]);
    expect(s[0]).toMatchObject({
      chord: ch(0, "major"),
      rating: 5,
      strength: 6,
    });
  });

  it("falls back to the major rules for types without rules", () => {
    expect(suggestNext([ch(2, "dom9")])[0]?.chord).toEqual(ch(7, "major"));
  });

  it("is empty for an empty line", () => expect(suggestNext([])).toEqual([]));
});

describe("R12 substitutions", () => {
  it("lists the R12 substitutions for C major, top 12, without the chord itself", () => {
    const s = substitutionsFor(ch(0, "major"));
    expect(s).toHaveLength(12);
    expect(
      s.slice(0, 2).map((x) => [x.chord.root, x.chord.type, x.reason]),
    ).toEqual([
      [6, "dom7", "tritoneSub"],
      [9, "minor", "relativeMinor"],
    ]);
    expect(s.map((x) => x.reason)).toContain("parallelMinor");
    expect(s.some((x) => x.chord.root === 0 && x.chord.type === "major")).toBe(
      false,
    );
  });

  it("uses the relative major and min7 for a minor chord", () => {
    const s = substitutionsFor(ch(9, "minor"));
    expect(s[1]).toMatchObject({
      chord: ch(0, "major"),
      reason: "relativeMajor",
    });
    expect(s.find((x) => x.reason === "addSeventh")?.chord.type).toBe("min7");
  });

  it("adds no 7th to a chord that has one", () => {
    expect(
      substitutionsFor(ch(0, "dom7")).some((x) => x.reason === "addSeventh"),
    ).toBe(false);
  });
});

describe("R10 detection", () => {
  it("needs 2 notes", () => expect(detectChords([0])).toEqual([]));

  it("lists exact matches first, then partial by size and root name", () => {
    const m = detectChords([0, 4, 7]);
    expect(m[0]).toMatchObject({ root: 0, type: "major", exact: true });
    expect(m.filter((x) => x.exact)).toHaveLength(1);
    expect(m[1]?.exact).toBe(false);
  });

  it("U09: names notes with R10 and the bass inversion", () => {
    expect(nameNotes([4, 7, 0])).toEqual(ch(0, "major", 1));
    expect(nameNotes([0, 3, 7])).toEqual(ch(0, "minor"));
    expect(nameNotes([0, 1, 2])).toBeNull();
  });
});
