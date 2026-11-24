/** A random source: returns a number in [0, 1). */
export type RandomSource = () => number;

/**
 * mulberry32: a small seeded generator (32-bit state). The same seed gives the
 * same sequence, so a generated chord sequence can repeat.
 */
export function mulberry32(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A 32-bit seed from any text (FNV-1a). A number text gives that number. */
export function seedFromText(text: string): number {
  const trimmed = text.trim();
  if (/^\d{1,9}$/.test(trimmed)) return Number(trimmed) >>> 0;
  let hash = 0x811c9dc5;
  for (let i = 0; i < trimmed.length; i++) {
    hash ^= trimmed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Draws an index with probability proportional to its weight. */
export function weightedIndex(
  weights: readonly number[],
  random: RandomSource,
): number {
  const total = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
  if (total <= 0) return 0;
  let r = random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i] ?? 0);
    if (r < 0) return i;
  }
  return weights.length - 1;
}
