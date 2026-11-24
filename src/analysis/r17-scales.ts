import { SCALES, toPitchClass, type PitchClass, type ScaleId } from "@/theory";
import type {
  Chroma,
  ChromaAggregates,
  NoteStrength,
  ScaleCandidate,
} from "./types";

/** R17 key profiles (index 0 = tonic). */
export const PROFILES = {
  ksMajor: [
    6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
  ],
  ksMinor: [
    6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
  ],
  tpMajor: [5, 2, 3.5, 2, 4.5, 4, 2, 4.5, 2, 3.5, 1.5, 4],
  tpMinor: [5, 2, 3.5, 4.5, 2, 4, 2, 4.5, 3.5, 2, 1.5, 4],
} as const;

/** R17 degree weights (semitone from the root → weight; a missing degree weighs 1). */
export const DEGREE_WEIGHTS: Partial<
  Record<ScaleId, Readonly<Record<number, number>>>
> = {
  major: { 0: 2.5, 2: 1.0, 4: 1.8, 5: 1.1, 7: 2.0, 9: 1.0, 11: 1.4 },
  naturalMinor: { 0: 2.5, 2: 1.0, 3: 1.8, 5: 1.1, 7: 2.0, 8: 0.9, 10: 1.3 },
  harmonicMinor: { 0: 2.5, 2: 1.0, 3: 1.8, 5: 1.1, 7: 2.0, 8: 0.9, 11: 1.6 },
  melodicMinor: { 0: 2.5, 2: 1.0, 3: 1.8, 5: 1.1, 7: 2.0, 9: 1.2, 11: 1.5 },
  dorian: { 0: 2.0, 2: 1.0, 3: 1.5, 5: 1.1, 7: 1.8, 9: 1.6, 10: 1.0 },
  phrygian: { 0: 2.0, 1: 1.8, 3: 1.2, 5: 1.0, 7: 1.5, 8: 1.0, 10: 1.0 },
  lydian: { 0: 2.0, 2: 1.0, 4: 1.6, 6: 1.8, 7: 1.8, 9: 1.0, 11: 1.2 },
  mixolydian: { 0: 2.0, 2: 1.0, 4: 1.6, 5: 1.1, 7: 1.8, 9: 1.0, 10: 1.6 },
  locrian: { 0: 2.0, 1: 1.5, 3: 1.2, 5: 1.0, 6: 1.8, 8: 1.0, 10: 1.0 },
  phrygianDominant: { 0: 2.2, 1: 1.9, 4: 1.9, 5: 1.1, 7: 1.6, 8: 1.0, 10: 1.0 },
  majorPentatonic: { 0: 2.5, 2: 1.3, 4: 1.8, 7: 2.0, 9: 1.3 },
  minorPentatonic: { 0: 2.5, 3: 1.8, 5: 1.3, 7: 2.0, 10: 1.3 },
  blues: { 0: 2.5, 3: 1.6, 5: 1.3, 6: 1.8, 7: 1.8, 10: 1.3 },
  majorBlues: { 0: 2.5, 2: 1.3, 3: 1.5, 4: 1.5, 7: 2.0, 9: 1.2 },
  hungarianMinor: { 0: 2.0, 2: 1.0, 3: 1.5, 6: 1.9, 7: 1.8, 8: 1.5, 11: 1.6 },
  arabic: { 0: 2.0, 2: 1.2, 4: 1.4, 5: 1.1, 6: 1.8, 8: 1.2, 10: 1.3 },
  japanese: { 0: 2.5, 1: 2.0, 5: 1.5, 7: 2.0, 8: 1.8 },
  bebopDominant: {
    0: 2.0,
    2: 1.0,
    4: 1.5,
    5: 1.0,
    7: 1.8,
    9: 1.0,
    10: 1.5,
    11: 1.3,
  },
};

/** R17 out-note weights: the strongest out-note weighs 0.40, the second 0.70, the others 1.0. */
const OUT_WEIGHTS = [0.4, 0.7];

/** Scales with a Krumhansl-Schmuckler score and the weight of that score in the blend. */
export const KS_BLEND: Partial<Record<ScaleId, number>> = {
  major: 0.75,
  naturalMinor: 0.75,
  harmonicMinor: 0.6,
  melodicMinor: 0.6,
};

export const TOP_KEPT = 8;
export const TOP_SHOWN = 5;
export const TIE_BAND = 0.97;
export const MIN_CONFIDENCE = 20;

/** Pearson correlation of two equal-length vectors (0 when one is constant). */
export function pearson(x: readonly number[], y: readonly number[]): number {
  const n = x.length;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = (x[i] ?? 0) - mx;
    const b = (y[i] ?? 0) - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den > 0 ? num / den : 0;
}

/** The chroma read from a root: index 0 = the root. */
export function rotate(chroma: Chroma, root: number): number[] {
  return Array.from({ length: 12 }, (_, i) => chroma[(i + root) % 12] ?? 0);
}

/** R17 Krumhansl-Schmuckler scores of one root (before the blend). */
export function ksScores(
  agg: ChromaAggregates,
  root: number,
): Record<"major" | "naturalMinor" | "harmonicMinor" | "melodicMinor", number> {
  const f = rotate(agg.full, root);
  const s = rotate(agg.start, root);
  const e = rotate(agg.end, root);
  const at = (v: number[], i: number) => v[i] ?? 0;
  const ksMaj = pearson(f, PROFILES.ksMajor);
  const ksMin = pearson(f, PROFILES.ksMinor);
  const tpMaj = pearson(f, PROFILES.tpMajor);
  const tpMin = pearson(f, PROFILES.tpMinor);
  const tonic = at(s, 0) + at(e, 0) + 0.5 * at(s, 7) + 0.5 * at(e, 7);
  const bonusMaj = 0.18 * tonic;
  const bonusMin = 0.18 * (tonic + 0.3 * (at(s, 3) + at(e, 3)));
  const sal = (x: number) => 0.4 * (at(s, x) + at(e, x)) + 0.2 * at(f, x);
  const majDelta = sal(0) - sal(9);
  const minDelta = sal(0) - sal(3);
  const modal = 0.15 * (at(f, 11) - at(f, 10));
  const major = (ksMaj + tpMaj) / 2 + bonusMaj + 0.3 * majDelta + modal;
  const minor = (ksMin + tpMin) / 2 + bonusMin + 0.3 * minDelta - modal;
  return {
    major,
    naturalMinor: minor,
    harmonicMinor: minor + 0.1 * at(f, 11),
    melodicMinor: minor + 0.07 * (at(f, 11) + at(f, 9)),
  };
}

/** R17 template score of one scale on one root (every scale except Cromática). */
export function templateScore(
  full: Chroma,
  root: number,
  intervals: readonly number[],
  weights: Readonly<Record<number, number>> = {},
): number {
  let inSum = 0;
  let weightSum = 0;
  let matched = 0;
  for (const i of intervals) {
    const v = full[(root + i) % 12] ?? 0;
    const w = weights[i] ?? 1;
    inSum += v * w;
    weightSum += w;
    if (v > 0.1) matched += 1;
  }
  const out: number[] = [];
  for (let i = 0; i < 12; i++) {
    if (intervals.includes(i)) continue;
    const v = full[(root + i) % 12] ?? 0;
    if (v > 0.08) out.push(v);
  }
  out.sort((a, b) => b - a);
  const outSum = out.reduce((sum, v, k) => sum + v * (OUT_WEIGHTS[k] ?? 1), 0);
  return (
    inSum / weightSum -
    (0.65 * outSum) / Math.max(1, out.length) +
    (0.12 * matched) / intervals.length
  );
}

/** Every scale (except Cromática) on every root with its R17 score, best first. */
export function scoreScales(
  agg: ChromaAggregates,
): { root: PitchClass; scale: ScaleId; score: number }[] {
  const out: { root: PitchClass; scale: ScaleId; score: number }[] = [];
  for (let root = 0; root < 12; root++) {
    const ks = ksScores(agg, root);
    for (const def of SCALES) {
      if (def.id === "chromatic") continue;
      let score = templateScore(
        agg.full,
        root,
        def.intervals,
        DEGREE_WEIGHTS[def.id],
      );
      const blend = KS_BLEND[def.id];
      if (blend !== undefined && def.id in ks) {
        const k = ks[def.id as keyof typeof ks];
        score = blend * ((k + 0.5) / 1.3) + (1 - blend) * score;
      }
      out.push({ root: toPitchClass(root), scale: def.id, score });
    }
  }
  // Stable: equal scores keep root order, then the R3 order.
  return out.sort((a, b) => b.score - a.score);
}

function strengthOf(strengths: readonly NoteStrength[], pc: number): number {
  return strengths.find((s) => s.pc === toPitchClass(pc))?.strength ?? 0;
}

/** R17 tonal gravity: 2 × strength(root) + strength(root + 5) + strength(root + 7). */
export function tonalGravity(
  strengths: readonly NoteStrength[],
  root: number,
): number {
  return (
    2 * strengthOf(strengths, root) +
    strengthOf(strengths, root + 5) +
    strengthOf(strengths, root + 7)
  );
}

function scaleNotes(root: number, scale: ScaleId): PitchClass[] {
  const def = SCALES.find((s) => s.id === scale);
  return (def?.intervals ?? []).map((i) => toPitchClass(root + i));
}

/**
 * R17 tie-break. Candidates within 97 % of the best score are re-ordered:
 * the root with the most tonal gravity wins (× 0.75 when that root is the
 * fifth of another candidate root). Among that root's scales, the one whose
 * distinguishing notes (notes not shared by all of them) have the higher mean
 * strength wins; equal → the higher score. The winner moves to the top.
 */
export function tieBreak<
  T extends { root: PitchClass; scale: ScaleId; score: number },
>(ranked: readonly T[], strengths: readonly NoteStrength[]): T[] {
  const best = ranked[0];
  if (!best) return [];
  const band = ranked.filter((c) => c.score >= TIE_BAND * best.score);
  if (band.length < 2) return [...ranked];
  const roots = [...new Set(band.map((c) => c.root))];
  const gravity = (root: PitchClass) => {
    const isFifth = roots.some(
      (o) => o !== root && toPitchClass(o + 7) === root,
    );
    return tonalGravity(strengths, root) * (isFifth ? 0.75 : 1);
  };
  // Ties keep the root of the better score (roots are in score order).
  let winRoot = roots[0] ?? best.root;
  for (const r of roots) if (gravity(r) > gravity(winRoot)) winRoot = r;

  const sameRoot = band.filter((c) => c.root === winRoot);
  const noteSets = sameRoot.map((c) => scaleNotes(c.root, c.scale));
  const shared = (noteSets[0] ?? []).filter((pc) =>
    noteSets.every((set) => set.includes(pc)),
  );
  const distinguishing = (c: T) => {
    const own = scaleNotes(c.root, c.scale).filter(
      (pc) => !shared.includes(pc),
    );
    if (own.length === 0) return 0;
    return own.reduce((s, pc) => s + strengthOf(strengths, pc), 0) / own.length;
  };
  let winner = sameRoot[0] ?? best;
  for (const c of sameRoot) {
    const d = distinguishing(c);
    const dw = distinguishing(winner);
    if (d > dw || (d === dw && c.score > winner.score)) winner = c;
  }
  return [winner, ...ranked.filter((c) => c !== winner)];
}

/**
 * F219 confidence with the U24 fix. The first scale (after the tie-break)
 * shows 100 %. The others show max(20, score / top score × 100), where the
 * top score is the highest score of the list, so no value is above 100 %.
 */
export function confidences(scores: readonly number[]): number[] {
  const top = Math.max(...scores);
  return scores.map((score, i) => {
    if (i === 0) return 100;
    if (!(top > 0)) return MIN_CONFIDENCE;
    return Math.min(
      100,
      Math.max(MIN_CONFIDENCE, Math.round((score / top) * 100)),
    );
  });
}

/** R17: the ranked scales, top 8, best first, with their confidence. */
export function rankScales(
  agg: ChromaAggregates,
  strengths: readonly NoteStrength[],
): ScaleCandidate[] {
  const kept = tieBreak(scoreScales(agg), strengths).slice(0, TOP_KEPT);
  const conf = confidences(kept.map((c) => c.score));
  return kept.map((c, i) => ({ ...c, confidence: conf[i] ?? MIN_CONFIDENCE }));
}

/** F220: up to 3 notes outside the scale with strength > 8 %, strongest first. */
export function tensionNotes(
  scale: { root: PitchClass; scale: ScaleId } | undefined,
  strengths: readonly NoteStrength[],
): NoteStrength[] {
  if (!scale) return [];
  const notes = scaleNotes(scale.root, scale.scale);
  return strengths
    .filter((s) => !notes.includes(s.pc) && s.strength > 0.08)
    .slice(0, 3);
}
