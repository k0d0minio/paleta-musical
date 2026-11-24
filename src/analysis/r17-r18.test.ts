import { describe, expect, it } from "vitest";
import type { PitchClass } from "@/theory";
import { l2Normalise, noteStrengths } from "./r16-chroma";
import {
  confidences,
  ksScores,
  pearson,
  PROFILES,
  rankScales,
  rotate,
  templateScore,
  tensionNotes,
  tieBreak,
  tonalGravity,
} from "./r17-scales";
import { activeNotes, chordCandidates } from "./r18-chords";
import type { ChromaAggregates, NoteStrength } from "./types";

function strengthsOf(values: Partial<Record<number, number>>): NoteStrength[] {
  return Array.from({ length: 12 }, (_, pc) => ({
    pc: pc as PitchClass,
    strength: values[pc] ?? 0,
  })).sort((a, b) => b.strength - a.strength || a.pc - b.pc);
}

function aggOf(full: number[]): ChromaAggregates {
  return { full, start: full, end: full, frames: 10 };
}

describe("R17 profiles and scores", () => {
  it("correlates a profile with itself as 1 and rotates by root", () => {
    expect(pearson(PROFILES.ksMajor, PROFILES.ksMajor)).toBeCloseTo(1);
    expect(pearson([1, 1, 1], [1, 2, 3])).toBe(0);
    expect(rotate([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 9)[0]).toBe(9);
  });

  it("scores the major key highest for a chroma shaped like the major profile on G", () => {
    const g = l2Normalise([
      ...PROFILES.ksMajor.slice(5),
      ...PROFILES.ksMajor.slice(0, 5),
    ]);
    const ks = ksScores(aggOf(g), 7);
    expect(ks.major).toBeGreaterThan(ks.naturalMinor);
    expect(ksScores(aggOf(g), 7).major).toBeGreaterThan(
      ksScores(aggOf(g), 0).major,
    );
    // Harmonic and melodic minor build on the natural-minor base.
    expect(ks.harmonicMinor).toBeCloseTo(ks.naturalMinor + 0.1 * (g[6] ?? 0));
  });

  it("computes the template score: degree weights, out-notes and matched notes", () => {
    const full = new Array<number>(12).fill(0);
    full[0] = 0.5;
    full[4] = 0.3;
    full[7] = 0.3;
    // in = 1.1 / 3, matched 3/3 → + 0.12; no out-note.
    expect(templateScore(full, 0, [0, 4, 7])).toBeCloseTo(1.1 / 3 + 0.12);
    full[2] = 0.2;
    full[5] = 0.09;
    // out = 0.2 × 0.40 + 0.09 × 0.70 = 0.143 over 2 notes.
    expect(templateScore(full, 0, [0, 4, 7])).toBeCloseTo(
      1.1 / 3 + 0.12 - (0.65 * 0.143) / 2,
    );
    // Weights: C weighs 2.
    expect(templateScore(full, 0, [0, 4, 7], { 0: 2 })).toBeCloseTo(
      1.6 / 4 + 0.12 - (0.65 * 0.143) / 2,
    );
  });
});

describe("R17 tie-break and confidence", () => {
  const strengths = strengthsOf({
    0: 1,
    2: 0.6,
    4: 0.7,
    5: 0.6,
    7: 0.8,
    9: 0.5,
    11: 0.4,
  });

  it("measures tonal gravity", () => {
    expect(tonalGravity(strengths, 0)).toBeCloseTo(2 + 0.6 + 0.8);
  });

  it("moves the root with the most tonal gravity to the top", () => {
    const ranked = [
      { root: 7 as PitchClass, scale: "major" as const, score: 1 },
      { root: 0 as PitchClass, scale: "major" as const, score: 0.98 },
      { root: 9 as PitchClass, scale: "naturalMinor" as const, score: 0.5 },
    ];
    const out = tieBreak(ranked, strengths);
    expect(out[0]).toMatchObject({ root: 0, scale: "major" });
    expect(out).toHaveLength(3);
  });

  it("leaves the order when no other candidate is within 97 %", () => {
    const ranked = [
      { root: 7 as PitchClass, scale: "major" as const, score: 1 },
      { root: 0 as PitchClass, scale: "major" as const, score: 0.9 },
    ];
    expect(tieBreak(ranked, strengths)[0]?.root).toBe(7);
  });

  it("among one root's scales, the stronger distinguishing notes win", () => {
    // C major vs C major pentatonic: major has F and B in addition.
    const ranked = [
      { root: 0 as PitchClass, scale: "majorPentatonic" as const, score: 1 },
      { root: 0 as PitchClass, scale: "major" as const, score: 0.99 },
    ];
    expect(tieBreak(ranked, strengths)[0]?.scale).toBe("major");
  });

  it("never shows a confidence above 100 % (U24) nor below 20 %", () => {
    // After the tie-break the first may score less than the second.
    expect(confidences([0.98, 1, 0.5, 0.05])).toEqual([100, 100, 50, 20]);
    expect(confidences([1, 0.8])).toEqual([100, 80]);
    expect(confidences([-1, -2])).toEqual([100, 20]);
  });

  it("ranks 8 scales with their confidence and gives the tension notes", () => {
    const full = [1, 0.05, 0.6, 0.05, 0.7, 0.6, 0.3, 0.8, 0.05, 0.5, 0.05, 0.4];
    const ranked = rankScales(aggOf(full), noteStrengths(full));
    expect(ranked).toHaveLength(8);
    expect(ranked[0]).toMatchObject({
      root: 0,
      scale: "major",
      confidence: 100,
    });
    expect(ranked.every((s) => s.confidence <= 100 && s.confidence >= 20)).toBe(
      true,
    );
    expect(
      tensionNotes(ranked[0], noteStrengths(full)).map((n) => n.pc),
    ).toEqual([6]);
  });
});

describe("R18 chord candidates", () => {
  it("uses the notes above 20 % and needs at least 2", () => {
    expect(activeNotes(strengthsOf({ 0: 1, 4: 0.21, 7: 0.2 }))).toEqual([0, 4]);
    expect(chordCandidates(strengthsOf({ 0: 1, 4: 0.1 }))).toEqual([]);
  });

  it("scores coverage × matches − 0.3 × extra and keeps the top 6", () => {
    const chords = chordCandidates(strengthsOf({ 0: 1, 4: 0.8, 7: 0.9 }));
    expect(chords[0]).toEqual({
      root: 0,
      type: "major",
      coverage: 1,
      score: 3,
    });
    expect(chords.length).toBeLessThanOrEqual(6);
    // C6 (C E G A): 3 of 4 → 0.75 × 3 = 2.25.
    expect(
      chords.find((c) => c.root === 0 && c.type === "six")?.score,
    ).toBeCloseTo(2.25);
  });

  it("drops a chord below 60 % coverage and penalises extra notes", () => {
    const chords = chordCandidates(
      strengthsOf({ 0: 1, 4: 0.8, 7: 0.9, 2: 0.5 }),
    );
    // C major now has one extra note (D): 3 − 0.3.
    expect(
      chords.find((c) => c.root === 0 && c.type === "major")?.score,
    ).toBeCloseTo(2.7);
    // A Dom7 on D (D F# A C) matches 2 of 4 = 50 %: dropped.
    expect(chords.some((c) => c.root === 2 && c.type === "dom7")).toBe(false);
    // Cadd9 (C E G D) covers all 4 active notes.
    expect(chords[0]).toMatchObject({
      root: 0,
      type: "add9",
      coverage: 1,
      score: 4,
    });
  });
});
