import type { ChordTypeId, PitchClass, ScaleId } from "@/theory";

/** A 12-bin pitch-class profile, index = pitch class (0 = C). */
export type Chroma = readonly number[];

/** R16 aggregates: the whole signal, its start and its end. */
export interface ChromaAggregates {
  readonly full: Chroma;
  readonly start: Chroma;
  readonly end: Chroma;
  /** Frames that passed the RMS gate. 0 means "no usable frame" (all bins 1/12). */
  readonly frames: number;
}

/** A pitch class and its strength, 0–1 relative to the strongest (F213). */
export interface NoteStrength {
  readonly pc: PitchClass;
  readonly strength: number;
}

/** R17: one ranked scale. */
export interface ScaleCandidate {
  readonly root: PitchClass;
  readonly scale: ScaleId;
  readonly score: number;
  /** F219 with the U24 fix: 20–100, the first is 100. */
  readonly confidence: number;
}

/** R18: one chord candidate. */
export interface ChordCandidate {
  readonly root: PitchClass;
  readonly type: ChordTypeId;
  /** Chord notes among the active notes / chord size, 0–1. */
  readonly coverage: number;
  readonly score: number;
}

/** One window of the over-time analysis. Times are in seconds from the start of the analysed signal. */
export interface Section {
  readonly start: number;
  readonly end: number;
  readonly scale: ScaleCandidate | null;
  readonly chord: ChordCandidate | null;
}

export interface AnalysisResult {
  readonly sampleRate: number;
  /** Duration of the analysed signal, in seconds. */
  readonly duration: number;
  readonly chroma: ChromaAggregates;
  /** F213, F216: all 12 pitch classes, strongest first. */
  readonly strengths: readonly NoteStrength[];
  /** R17: top 8, best first (F219 shows 5). */
  readonly scales: readonly ScaleCandidate[];
  /** F220: up to 3 notes outside the first scale with strength > 8 %, strongest first. */
  readonly tensions: readonly NoteStrength[];
  /** R18: top 6, best first. */
  readonly chords: readonly ChordCandidate[];
  /** Over-time strip: one entry per window. */
  readonly sections: readonly Section[];
}

/** The steps of the pipeline, in order. The status text names the real step (U25). */
export const ANALYSIS_STEPS = [
  "chroma",
  "scales",
  "chords",
  "sections",
] as const;
export type AnalysisStep = (typeof ANALYSIS_STEPS)[number];

export interface AnalysisHooks {
  /** Progress of a step, 0–1. */
  readonly onProgress?: (step: AnalysisStep, fraction: number) => void;
  /**
   * Called between frames. The main-thread fallback returns a promise that
   * yields to the event loop, so the UI stays responsive.
   */
  readonly yieldControl?: () => Promise<void> | void;
  /** Stops the analysis at the next frame (it throws an AbortError). */
  readonly signal?: { readonly aborted: boolean };
}
