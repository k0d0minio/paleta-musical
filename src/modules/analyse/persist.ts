import { z } from "zod";
import type { AnalysisResult } from "@/analysis";
import { blobStorage, useAppStore } from "@/state";
import { isChordTypeId, isPitchClass, isScaleId } from "@/theory";

/**
 * F214 + reload: the last result lives in the persisted store under
 * `modules.analyse.last` (validated here, the store keeps module slices
 * loose). The file bytes go to the blob store, so the waveform and the piano
 * roll come back after a reload.
 */
export const FILE_BLOB_KEY = "analyse:file";

const pc = z.number().refine(isPitchClass);
const chroma = z.array(z.number()).length(12);
const strength = z.object({ pc, strength: z.number() });
const scale = z.object({
  root: pc,
  scale: z.string().refine(isScaleId),
  score: z.number(),
  confidence: z.number().min(0).max(100),
});
const chord = z.object({
  root: pc,
  type: z.string().refine(isChordTypeId),
  coverage: z.number(),
  score: z.number(),
});

export const resultSchema = z.object({
  sampleRate: z.number().positive(),
  duration: z.number().nonnegative(),
  chroma: z.object({
    full: chroma,
    start: chroma,
    end: chroma,
    frames: z.number().int().nonnegative(),
  }),
  strengths: z.array(strength).length(12),
  scales: z.array(scale),
  tensions: z.array(strength),
  chords: z.array(chord),
  sections: z.array(
    z.object({
      start: z.number(),
      end: z.number(),
      scale: scale.nullable(),
      chord: chord.nullable(),
    }),
  ),
});

export const fileMetaSchema = z.object({
  name: z.string(),
  sizeBytes: z.number().nonnegative(),
  duration: z.number().nonnegative(),
  sampleRate: z.number().positive(),
});
export type FileMeta = z.infer<typeof fileMetaSchema>;

export const regionSchema = z.object({
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
});
export type Region = z.infer<typeof regionSchema>;

export const lastAnalysisSchema = z.object({
  file: fileMetaSchema,
  /** The analysed part of the file, in seconds. */
  range: regionSchema,
  /** True when the analysed part is the selected region. */
  isRegion: z.boolean(),
  /** True when a long file was cut to the memory limit. */
  truncated: z.boolean(),
  result: resultSchema,
});
export type LastAnalysis = Omit<
  z.infer<typeof lastAnalysisSchema>,
  "result"
> & {
  result: AnalysisResult;
};

/** The stored last analysis, or null when there is none or it is invalid. */
export function readLastAnalysis(value: unknown): LastAnalysis | null {
  const parsed = lastAnalysisSchema.safeParse(value);
  return parsed.success ? (parsed.data as LastAnalysis) : null;
}

export function saveLastAnalysis(last: LastAnalysis | null): void {
  useAppStore.getState().setModuleState("analyse", { last });
}

export interface StoredFile {
  readonly name: string;
  readonly type: string;
  readonly bytes: ArrayBuffer;
}

export async function saveFileBytes(file: StoredFile): Promise<void> {
  try {
    await blobStorage.set(FILE_BLOB_KEY, file);
  } catch {
    // Quota or no IndexedDB: the result still stays; the waveform does not.
  }
}

export async function loadFileBytes(): Promise<StoredFile | null> {
  try {
    const value = await blobStorage.get<StoredFile>(FILE_BLOB_KEY);
    return value && value.bytes instanceof ArrayBuffer ? value : null;
  } catch {
    return null;
  }
}

export async function deleteFileBytes(): Promise<void> {
  try {
    await blobStorage.delete(FILE_BLOB_KEY);
  } catch {
    // Nothing to delete.
  }
}
