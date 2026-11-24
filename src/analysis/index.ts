/**
 * Audio-file analysis (JAM-551): the client's R16 chroma, R17 scale ranking
 * and R18 chord candidates as pure TypeScript. No DOM, no React, no Web
 * Audio: it runs the same in a Web Worker, on the main thread and in tests.
 */
export * from "./types";
export {
  AbortError,
  R16,
  analyseFrame,
  chromaAggregates,
  endWeight,
  frameOffsets,
  harmonicSalience,
  l2Normalise,
  mixToMono,
  noteStrengths,
  octaveWeight,
  residualSalience,
  startWeight,
} from "./r16-chroma";
export {
  DEGREE_WEIGHTS,
  KS_BLEND,
  MIN_CONFIDENCE,
  PROFILES,
  TOP_KEPT,
  TOP_SHOWN,
  confidences,
  ksScores,
  pearson,
  rankScales,
  scoreScales,
  templateScore,
  tensionNotes,
  tieBreak,
  tonalGravity,
} from "./r17-scales";
export { R18, activeNotes, chordCandidates } from "./r18-chords";
export {
  CHORDS_FROM_ENERGY,
  SECTION_MAX_COUNT,
  SECTION_MIN_SECONDS,
  analyseSignal,
  chordStrengths,
  peaks,
  sectionBounds,
} from "./pipeline";
export {
  magnitudeAt,
  magnitudeSpectrum,
  rms,
  spectralFlatness,
} from "./spectrum";
