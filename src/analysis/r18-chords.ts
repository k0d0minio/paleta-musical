import {
  CHORD_TYPES,
  chordPitchClasses,
  toPitchClass,
  type PitchClass,
} from "@/theory";
import type { ChordCandidate, NoteStrength } from "./types";

export const R18 = {
  activeStrength: 0.2,
  minActive: 2,
  minMatches: 2,
  minCoverage: 0.6,
  extraPenalty: 0.3,
  top: 6,
} as const;

/** R18 active notes: strength > 0.2. */
export function activeNotes(strengths: readonly NoteStrength[]): PitchClass[] {
  return strengths
    .filter((s) => s.strength > R18.activeStrength)
    .map((s) => s.pc);
}

/**
 * R18: every root and chord type. matches = chord notes among the active
 * notes; coverage = matches / chord size; extra = active notes outside the
 * chord. Kept when matches ≥ 2 and coverage ≥ 0.6; score = coverage ×
 * matches − 0.3 × extra. Top 6 by score (equal scores keep root, then R4 order).
 */
export function chordCandidates(
  strengths: readonly NoteStrength[],
): ChordCandidate[] {
  const active = activeNotes(strengths);
  if (active.length < R18.minActive) return [];
  const out: ChordCandidate[] = [];
  for (let r = 0; r < 12; r++) {
    const root = toPitchClass(r);
    for (const type of CHORD_TYPES) {
      const pcs = chordPitchClasses(root, type.id);
      const matches = pcs.filter((pc) => active.includes(pc)).length;
      const coverage = matches / pcs.length;
      if (matches < R18.minMatches || coverage < R18.minCoverage) continue;
      const extra = active.filter((pc) => !pcs.includes(pc)).length;
      out.push({
        root,
        type: type.id,
        coverage,
        score: coverage * matches - R18.extraPenalty * extra,
      });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, R18.top);
}
