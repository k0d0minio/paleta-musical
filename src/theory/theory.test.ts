import { ChordType, ScaleType, Interval } from "tonal";
import { describe, expect, it } from "vitest";
import {
  CHORD_TYPES,
  SCALES,
  chordPitchClasses,
  formatNoteName,
  frequency,
  invertIntervals,
  letterName,
  noteLabel,
  realizeAscending,
  realizeChordInOctave,
  scalePitchClasses,
  toMidi,
  voiceChord,
} from ".";

const semitones = (names: string[]) => names.map((n) => Interval.semitones(n));

describe("reference tables map to tonal", () => {
  it.each(SCALES.map((s) => [s.id, s] as const))(
    "scale %s (R3)",
    (_id, scale) => {
      expect(scale.tonal).not.toBeNull();
      expect(semitones(ScaleType.get(scale.tonal).intervals)).toEqual([
        ...scale.intervals,
      ]);
    },
  );

  it.each(CHORD_TYPES.filter((c) => c.tonal).map((c) => [c.id, c] as const))(
    "chord type %s (R4)",
    (_id, chord) => {
      expect(semitones(ChordType.get(chord.tonal ?? "").intervals)).toEqual([
        ...chord.intervals,
      ]);
    },
  );

  it("has 19 scales and 24 chord types", () => {
    expect(SCALES).toHaveLength(19);
    expect(CHORD_TYPES).toHaveLength(24);
  });
});

describe("pitch", () => {
  it("puts C4 at MIDI 60 and 261.63 Hz", () => {
    expect(toMidi({ pc: 0, octave: 4 })).toBe(60);
    expect(frequency({ pc: 0, octave: 4 })).toBeCloseTo(261.63, 2);
    expect(frequency({ pc: 9, octave: 4 })).toBe(440);
  });
});

describe("realize (U33)", () => {
  it("plays a D major scale upward across C", () => {
    const notes = realizeAscending(scalePitchClasses(2, "major"), 4);
    const midi = notes.map(toMidi);
    expect(midi).toEqual([62, 64, 66, 67, 69, 71, 73]);
    for (let i = 1; i < midi.length; i++)
      expect(midi[i]).toBeGreaterThan(midi[i - 1] ?? 0);
    expect(notes.at(-1)).toEqual({ pc: 1, octave: 5 });
  });

  it("places the last chord within the octave above its root (F023)", () => {
    expect(realizeChordInOctave([9, 0, 4], 4).map(toMidi)).toEqual([
      69, 72, 76,
    ]);
  });
});

describe("voicing (one inversion model)", () => {
  it("voices C major in root position and inversions", () => {
    expect(
      voiceChord({ root: 0, type: "major", inversion: 0 }, 4).map(toMidi),
    ).toEqual([60, 64, 67]);
    expect(
      voiceChord({ root: 0, type: "major", inversion: 1 }, 4).map(toMidi),
    ).toEqual([64, 67, 72]);
    expect(
      voiceChord({ root: 0, type: "major", inversion: 2 }, 4).map(toMidi),
    ).toEqual([67, 72, 76]);
  });

  it("keeps extended voices above the moved root", () => {
    expect(invertIntervals([0, 4, 7, 14], 1)).toEqual([4, 7, 14, 24]);
  });

  it("gives chord pitch classes root first", () => {
    expect(chordPitchClasses(2, "min7")).toEqual([2, 5, 9, 0]);
  });
});

describe("names", () => {
  it("gives letter and solfège names (R1)", () => {
    expect(noteLabel(1)).toEqual({ letter: "C♯", solfege: "Dó♯" });
    expect(formatNoteName(noteLabel(7), "both")).toBe("G · Sol");
  });

  it("spells by key", () => {
    expect(letterName(10, "key", { tonic: 5, scale: "major" })).toBe("B♭");
    expect(letterName(6, "key", { tonic: 2, scale: "major" })).toBe("F♯");
    expect(letterName(3, "flats")).toBe("E♭");
  });
});
