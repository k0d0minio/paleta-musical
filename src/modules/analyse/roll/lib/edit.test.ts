import { describe, expect, it } from "vitest";
import {
  copyNotes,
  distinctPitchClasses,
  drawNote,
  gridStepSeconds,
  isOnEnd,
  moveNotes,
  noteAt,
  notesInBox,
  notesOfPitchClass,
  pasteNotes,
  pitchClassSummary,
  quantize,
  removeNotes,
  resizeNotes,
  setVelocity,
  stepSelection,
} from "./edit";
import { DEFAULT_SETTINGS, GRIDS, type RollNote } from "./model";

const note = (
  id: string,
  midi: number,
  start: number,
  duration = 0.5,
): RollNote => ({
  id,
  midi,
  start,
  duration,
  velocity: 100,
});

describe("U22: the quantize grid is a setting", () => {
  it("defaults to 1/16 (F230)", () => {
    expect(DEFAULT_SETTINGS.grid).toBe("1/16");
    expect(gridStepSeconds("1/16", 120)).toBeCloseTo(60 / 120 / 4, 12);
  });

  it("has 1/4, 1/8, 1/16, 1/32 and triplets", () => {
    expect([...GRIDS]).toEqual(["1/4", "1/8", "1/16", "1/32", "1/8t", "1/16t"]);
    expect(gridStepSeconds("1/4", 120)).toBeCloseTo(0.5, 12);
    expect(gridStepSeconds("1/8", 120)).toBeCloseTo(0.25, 12);
    expect(gridStepSeconds("1/32", 120)).toBeCloseTo(0.0625, 12);
    expect(gridStepSeconds("1/8t", 120)).toBeCloseTo(0.5 / 3, 12);
    expect(gridStepSeconds("1/16t", 120)).toBeCloseTo(0.25 / 3, 12);
  });

  it("snaps starts and ends to the chosen grid, minimum half a step", () => {
    const notes = [note("a", 60, 0.13, 0.3), note("b", 62, 0.49, 0.02)];
    const q8 = quantize(notes, "1/8", 120);
    expect(q8[0]?.start).toBeCloseTo(0.25, 12);
    expect(q8[0]?.duration).toBeCloseTo(0.25, 12);
    expect(q8[1]?.start).toBeCloseTo(0.5, 12);
    expect(q8[1]?.duration).toBeCloseTo(0.125, 12);
    const q16 = quantize(notes, "1/16", 120);
    expect(q16[0]?.start).toBeCloseTo(0.125, 12);
    expect(q16[0]?.duration).toBeCloseTo(0.25, 12);
  });

  it("quantizes only the given ids", () => {
    const notes = [note("a", 60, 0.13), note("b", 62, 0.13)];
    const q = quantize(notes, "1/4", 120, new Set(["b"]));
    expect(q[0]?.start).toBe(0.13);
    expect(q[1]?.start).toBe(0);
  });
});

describe("edits", () => {
  const notes = [note("a", 60, 1), note("b", 64, 2), note("c", 96, 3)];

  it("F252: moves a group in time (not before 0) and pitch (inside 36–96)", () => {
    const moved = moveNotes(notes, new Set(["a", "b"]), -5, 2);
    expect(moved[0]).toMatchObject({ start: 0, midi: 62 });
    expect(moved[1]).toMatchObject({ start: 1, midi: 66 });
    expect(moved[2]).toBe(notes[2]);
    const up = moveNotes(notes, new Set(["b", "c"]), 0, 5);
    expect(up[1]?.midi).toBe(64);
    expect(up[2]?.midi).toBe(96);
  });

  it("F253: resize keeps 0.05 s minimum", () => {
    expect(resizeNotes(notes, new Set(["a"]), -1)[0]?.duration).toBe(0.05);
  });

  it("F255: a drawn note is half a beat, velocity 90", () => {
    const n = drawNote(60, 1.5, 120);
    expect(n).toMatchObject({
      midi: 60,
      start: 1.5,
      duration: 0.25,
      velocity: 90,
    });
  });

  it("F256, F229: removes notes", () => {
    expect(removeNotes(notes, new Set(["a", "c"])).map((n) => n.id)).toEqual([
      "b",
    ]);
  });

  it("sets the velocity (1–127)", () => {
    expect(setVelocity(notes, new Set(["a"]), 200)[0]?.velocity).toBe(127);
    expect(setVelocity(notes, new Set(["a"]), 0)[0]?.velocity).toBe(1);
  });

  it("hit tests a note and its end handle", () => {
    expect(noteAt(notes, 1.2, 60)?.id).toBe("a");
    expect(noteAt(notes, 1.2, 61)).toBeNull();
    const a = notes[0];
    if (!a) throw new Error("no note");
    expect(isOnEnd(a, 1.48, 0.05)).toBe(true);
    expect(isOnEnd(a, 1.2, 0.05)).toBe(false);
  });

  it("selects by box and by pitch class (F261)", () => {
    expect([...notesInBox(notes, 0.5, 2.1, 70, 50)].sort()).toEqual(["a", "b"]);
    const more = [...notes, note("d", 72, 4)];
    expect([...notesOfPitchClass(more, 0)].sort()).toEqual(["a", "c", "d"]);
  });

  it("copies and pastes with relative times", () => {
    const clip = copyNotes(notes, new Set(["a", "b"]));
    expect(clip.map((n) => n.start)).toEqual([0, 1]);
    const pasted = pasteNotes(clip, 5);
    expect(pasted.map((n) => n.start)).toEqual([5, 6]);
    expect(new Set(pasted.map((n) => n.id)).size).toBe(2);
    expect(pasted.some((p) => notes.some((n) => n.id === p.id))).toBe(false);
  });

  it("F261, F262: summary by pitch class and distinct pitch classes", () => {
    const more = [...notes, note("d", 72, 4)];
    expect(pitchClassSummary(more)).toEqual([
      { pc: 0, count: 3 },
      { pc: 4, count: 1 },
    ]);
    expect(distinctPitchClasses(more)).toEqual([0, 4]);
  });

  it("steps the keyboard selection in time order", () => {
    expect(stepSelection(notes, null, 1)?.id).toBe("a");
    expect(stepSelection(notes, "a", 1)?.id).toBe("b");
    expect(stepSelection(notes, "c", 1)?.id).toBe("c");
    expect(stepSelection(notes, null, -1)?.id).toBe("c");
  });
});
