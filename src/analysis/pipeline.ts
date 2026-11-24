import { AbortError, chromaAggregates, noteStrengths } from "./r16-chroma";
import { rankScales, tensionNotes } from "./r17-scales";
import { chordCandidates } from "./r18-chords";
import type {
  AnalysisHooks,
  AnalysisResult,
  Chroma,
  NoteStrength,
  Section,
} from "./types";

/**
 * Improvement over R18 (JAM-551, open question for the client): R16 ends
 * with a cube root, so harmonics and leakage keep 20–56 % strength and R18
 * (active = strength > 0.2) sees every note as active ("Dm11" for a C major
 * triad). Chord candidates use energy strengths: the full chroma cubed (the
 * cube root undone), / its maximum. The shown note strengths and the scales
 * keep the R16 values. Set to false for the literal R18 input.
 */
export const CHORDS_FROM_ENERGY = true;

/** The strengths that R18 reads (see CHORDS_FROM_ENERGY). */
export function chordStrengths(
  full: Chroma,
  strengths: readonly NoteStrength[],
): readonly NoteStrength[] {
  return CHORDS_FROM_ENERGY
    ? noteStrengths(full.map((v) => v ** 3))
    : strengths;
}

/** Over-time windows: at least 2 s each, at most 64 windows. */
export const SECTION_MIN_SECONDS = 2;
export const SECTION_MAX_COUNT = 64;

/**
 * The windows of the over-time strip: count = round(duration / length) with
 * length = max(2 s, duration / 64), at least 1; the windows split the signal
 * into equal parts. Returns [start, end) in samples.
 */
export function sectionBounds(
  length: number,
  sampleRate: number,
): [number, number][] {
  if (length <= 0) return [];
  const duration = length / sampleRate;
  const windowSeconds = Math.max(
    SECTION_MIN_SECONDS,
    duration / SECTION_MAX_COUNT,
  );
  const count = Math.max(
    1,
    Math.min(SECTION_MAX_COUNT, Math.round(duration / windowSeconds)),
  );
  return Array.from({ length: count }, (_, i) => [
    Math.round((i * length) / count),
    Math.round(((i + 1) * length) / count),
  ]);
}

/**
 * The whole pipeline on a mono signal: R16 chroma, R17 scales, R18 chords,
 * then R16–R18 again on each window of the over-time strip. Bin frequencies
 * use `sampleRate`, the rate of the decoded signal (U23).
 */
export async function analyseSignal(
  samples: Float32Array,
  sampleRate: number,
  hooks: AnalysisHooks = {},
): Promise<AnalysisResult> {
  const chroma = await chromaAggregates(samples, sampleRate, hooks);
  const strengths = noteStrengths(chroma.full);

  hooks.onProgress?.("scales", 0);
  await hooks.yieldControl?.();
  const scales = chroma.frames > 0 ? rankScales(chroma, strengths) : [];
  const tensions = tensionNotes(scales[0], strengths);
  hooks.onProgress?.("scales", 1);

  hooks.onProgress?.("chords", 0);
  const chords =
    chroma.frames > 0
      ? chordCandidates(chordStrengths(chroma.full, strengths))
      : [];
  hooks.onProgress?.("chords", 1);

  const bounds = sectionBounds(samples.length, sampleRate);
  const sections: Section[] = [];
  for (const [i, [from, to]] of bounds.entries()) {
    if (hooks.signal?.aborted) throw new AbortError();
    const part = samples.subarray(from, to);
    const c = await chromaAggregates(part, sampleRate, {
      signal: hooks.signal,
      yieldControl: hooks.yieldControl,
    });
    const s = noteStrengths(c.full);
    sections.push({
      start: from / sampleRate,
      end: to / sampleRate,
      scale: c.frames > 0 ? (rankScales(c, s)[0] ?? null) : null,
      chord:
        c.frames > 0
          ? (chordCandidates(chordStrengths(c.full, s))[0] ?? null)
          : null,
    });
    hooks.onProgress?.("sections", (i + 1) / bounds.length);
  }

  return {
    sampleRate,
    duration: samples.length / sampleRate,
    chroma,
    strengths,
    scales,
    tensions,
    chords,
    sections,
  };
}

/** Waveform peaks: the maximum absolute sample of each of `count` equal blocks. */
export function peaks(samples: Float32Array, count: number): Float32Array {
  const out = new Float32Array(Math.max(0, count));
  if (samples.length === 0 || count <= 0) return out;
  const block = samples.length / count;
  for (let i = 0; i < count; i++) {
    const from = Math.floor(i * block);
    const to = Math.max(from + 1, Math.floor((i + 1) * block));
    let max = 0;
    for (let j = from; j < to && j < samples.length; j++) {
      const v = Math.abs(samples[j] ?? 0);
      if (v > max) max = v;
    }
    out[i] = max;
  }
  return out;
}
