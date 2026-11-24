import { Key, Note } from "tonal";
import { describe, expect, it } from "vitest";
import {
  CIRCLE_OF_FIFTHS,
  cadence,
  chordPitchClasses,
  circleStep,
  dominantOf,
  keyRole,
  keySignature,
  majorDiatonicTriads,
  majorKeyName,
  minorDiatonicTriads,
  minorKeyName,
  neighbourChords,
  oneFourFiveOne,
  relativeMinor,
  subdominantOf,
  twoFiveOne,
  type PitchClass,
} from ".";

/** R14 as written in docs/features.md. */
const R14 = [
  ["C", "A", "0 #"],
  ["G", "E", "1 #"],
  ["D", "B", "2 #"],
  ["A", "F#", "3 #"],
  ["E", "C#", "4 #"],
  ["B", "G#", "5 #"],
  ["F#", "D#", "6 #"],
  ["C#", "A#", "7 #"],
  ["G#", "F", "4 ♭"],
  ["D#", "C", "3 ♭"],
  ["A#", "G", "2 ♭"],
  ["F", "D", "1 ♭"],
] as const;

const pc = (name: string) => Note.chroma(name) as PitchClass;
const ascii = (name: string) => name.replace("♯", "#").replace("♭", "b");

describe("R14 circle of fifths (table test)", () => {
  it.each(R14.map((row, i) => [i, ...row] as const))(
    "%i: %s major, relative minor %s, signature %s",
    (index, major, minor, signature) => {
      expect(CIRCLE_OF_FIFTHS[index]).toBe(pc(major));
      expect(relativeMinor(pc(major))).toBe(pc(minor));
      const sig = keySignature(pc(major));
      expect(`${sig.count} ${sig.accidental === "sharp" ? "#" : "♭"}`).toBe(
        signature,
      );
    },
  );

  it("names the flat keys A♭, E♭, B♭ with 'by key' spelling, and the signature matches the name", () => {
    expect(CIRCLE_OF_FIFTHS.map((k) => majorKeyName(k, "key"))).toEqual([
      "C",
      "G",
      "D",
      "A",
      "E",
      "B",
      "F♯",
      "C♯",
      "A♭",
      "E♭",
      "B♭",
      "F",
    ]);
    for (const k of CIRCLE_OF_FIFTHS) {
      const name = ascii(majorKeyName(k, "key"));
      const tonal = Key.majorKey(name);
      const sig = keySignature(k, "key");
      expect(sig.keyName).toBe(majorKeyName(k, "key"));
      expect(tonal.keySignature.length).toBe(sig.count);
      if (sig.count > 0)
        expect(tonal.keySignature[0]).toBe(
          sig.accidental === "sharp" ? "#" : "b",
        );
      // The relative minor name is the one tonal gives for that key.
      expect(ascii(minorKeyName(relativeMinor(k), "key"))).toBe(
        tonal.minorRelative,
      );
    }
  });

  it("gives D♭ and G♭ their flat signatures with flat spelling", () => {
    expect(keySignature(1, "flats")).toEqual({
      count: 5,
      accidental: "flat",
      keyName: "D♭",
    });
    expect(keySignature(6, "flats")).toMatchObject({
      count: 6,
      accidental: "flat",
    });
    expect(keySignature(8, "sharps")).toMatchObject({
      count: 4,
      accidental: "flat",
      keyName: "A♭",
    });
  });

  it("steps around the circle and finds the dominant, subdominant and roles", () => {
    expect(circleStep(0, 1)).toBe(7);
    expect(circleStep(0, -1)).toBe(5);
    expect(circleStep(5, 1)).toBe(0);
    expect(dominantOf(0)).toBe(7);
    expect(subdominantOf(0)).toBe(5);
    expect(keyRole(0, 0)).toBe("tonic");
    expect(keyRole(0, 7)).toBe("dominant");
    expect(keyRole(0, 5)).toBe("subdominant");
    expect(keyRole(0, 2)).toBe("other");
  });
});

const names = (chords: { chord: { root: PitchClass; type: string } }[]) =>
  chords.map((c) => `${c.chord.root}:${c.chord.type}`);

describe("Harmonia chords", () => {
  it("lists the diatonic triads of the key and its relative minor (R5)", () => {
    const major = majorDiatonicTriads(0);
    expect(major.map((c) => c.roman)).toEqual([
      "I",
      "ii",
      "iii",
      "IV",
      "V",
      "vi",
      "vii°",
    ]);
    expect(names(major)).toEqual(
      ["0:major", "2:minor", "4:minor", "5:major", "7:major", "9:minor"].concat(
        "11:dim",
      ),
    );
    // Same pitch classes as tonal's diatonic triads of C major.
    expect(
      major.map((c) => chordPitchClasses(c.chord.root, c.chord.type)),
    ).toEqual(
      Key.majorKey("C").triads.map((t) =>
        chordPitchClasses(
          pc(t.replace(/(m|dim)$/, "")),
          t.endsWith("dim") ? "dim" : t.endsWith("m") ? "minor" : "major",
        ),
      ),
    );
    expect(names(minorDiatonicTriads(9))).toEqual([
      "9:minor",
      "11:dim",
      "0:major",
      "2:minor",
      "4:minor",
      "5:major",
      "7:major",
    ]);
  });

  it("gives the neighbour chords IV, V, vi (F197)", () => {
    expect(names(neighbourChords(7))).toEqual([
      "0:major",
      "2:major",
      "4:minor",
    ]);
  });

  it("builds the four cadences as F200 says", () => {
    expect(names(cadence("perfect", 0))).toEqual(["7:major", "0:major"]);
    expect(names(cadence("plagal", 0))).toEqual(["5:major", "0:major"]);
    expect(names(cadence("jazz", 0))).toEqual(["2:minor", "7:dom7", "0:major"]);
    expect(names(cadence("pop", 0))).toEqual([
      "0:major",
      "9:minor",
      "5:major",
      "7:major",
    ]);
  });

  it("sends I–IV–V–I and ii–V–I with valid R4 types (F203, F204)", () => {
    expect(names(oneFourFiveOne(2))).toEqual([
      "2:major",
      "7:major",
      "9:major",
      "2:major",
    ]);
    const iiVI = twoFiveOne(2);
    expect(names(iiVI)).toEqual(["4:minor", "9:dom7", "2:major"]);
    expect(iiVI.map((c) => c.tension ?? false)).toEqual([false, true, false]);
  });
});
