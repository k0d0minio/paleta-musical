import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";
import { z } from "zod";
import {
  BPM_MAX,
  BPM_MIN,
  CHORD_TYPE_IDS,
  RHYTHM_IDS,
  SCALE_IDS,
  toPitchClass,
  type ChordRef,
  type RhythmId,
  type ScaleId,
} from "@/theory";

/** A progression in a share link or in the library. */
export interface ProgressionData {
  readonly key: number;
  readonly scale: ScaleId;
  readonly rhythm: RhythmId;
  readonly bpm: number;
  readonly chords: readonly { chord: ChordRef; tension: boolean }[];
}

export const SHARE_PARAM = "p";

// Compact form: [root, chord type index, inversion, tension 0|1].
const compact = z.object({
  v: z.literal(1),
  k: z.number().int().min(0).max(11),
  s: z
    .number()
    .int()
    .min(0)
    .max(SCALE_IDS.length - 1),
  r: z
    .number()
    .int()
    .min(0)
    .max(RHYTHM_IDS.length - 1),
  b: z.number().int().min(BPM_MIN).max(BPM_MAX),
  c: z
    .array(
      z.tuple([
        z.number().int().min(0).max(11),
        z
          .number()
          .int()
          .min(0)
          .max(CHORD_TYPE_IDS.length - 1),
        z.number().int().min(0).max(5),
        z.union([z.literal(0), z.literal(1)]),
      ]),
    )
    .min(1)
    .max(256),
});

/** Encodes a progression for the URL hash (lz-string, URL-safe). */
export function encodeProgression(p: ProgressionData): string {
  return compressToEncodedURIComponent(
    JSON.stringify({
      v: 1,
      k: p.key,
      s: SCALE_IDS.indexOf(p.scale),
      r: RHYTHM_IDS.indexOf(p.rhythm),
      b: p.bpm,
      c: p.chords.map(({ chord, tension }) => [
        chord.root,
        CHORD_TYPE_IDS.indexOf(chord.type),
        chord.inversion,
        tension ? 1 : 0,
      ]),
    }),
  );
}

/** Decodes and validates a shared progression; null when the text is not valid. */
export function decodeProgression(text: string): ProgressionData | null {
  try {
    const json = decompressFromEncodedURIComponent(text);
    if (!json) return null;
    const parsed = compact.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    const d = parsed.data;
    return {
      key: d.k,
      scale: SCALE_IDS[d.s] ?? "major",
      rhythm: RHYTHM_IDS[d.r] ?? "simples",
      bpm: d.b,
      chords: d.c.map(([root, type, inversion, tension]) => ({
        chord: {
          root: toPitchClass(root),
          type: CHORD_TYPE_IDS[type] ?? "major",
          inversion,
        },
        tension: tension === 1,
      })),
    };
  } catch {
    return null;
  }
}

/** The share link: the progressions page, builder tab, progression in the hash. */
export function shareUrl(origin: string, p: ProgressionData): string {
  return `${origin}/progressions?tab=builder#${SHARE_PARAM}=${encodeProgression(p)}`;
}

/** Reads a shared progression from a location hash ("#p=…"). */
export function progressionFromHash(
  hash: string,
): ProgressionData | null | undefined {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const value = params.get(SHARE_PARAM);
  if (value === null) return undefined;
  return decodeProgression(value);
}
