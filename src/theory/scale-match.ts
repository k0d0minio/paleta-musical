import { PcSet } from "tonal";
import { SHARP_LETTERS } from "./names";
import { PITCH_CLASSES, toPitchClass, type PitchClass } from "./pitch";
import { SCALES, scalePitchClasses, type ScaleId } from "./scales";

/** One scale on one root, with the selected notes it holds. */
export interface ScaleMatch {
  readonly root: PitchClass;
  readonly scale: ScaleId;
  /** The scale pitch classes, in scale order from the root. */
  readonly pcs: readonly PitchClass[];
  /** How many selected notes the scale holds. */
  readonly matched: number;
  /** How many distinct notes were selected. */
  readonly total: number;
}

const ASCII = SHARP_LETTERS.map((n) => n.replace("♯", "#"));

function distinct(notes: readonly PitchClass[]): PitchClass[] {
  return [...new Set(notes.map((n) => toPitchClass(n)))];
}

/**
 * Every scale (R3) on every root, with the count of selected notes it holds.
 * Ties keep a musical order: a root equal to the first selected note first,
 * then the R3 order, then the roots upward from the first selected note
 * (so C E G gives C major before A natural minor).
 */
function allMatches(selection: readonly PitchClass[]): ScaleMatch[] {
  const first = selection[0] ?? 0;
  const roots = PITCH_CLASSES.map((i) => toPitchClass(first + i));
  const names = selection.map((pc) => ASCII[pc]);
  const out: ScaleMatch[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    for (const scale of SCALES) {
      const pcs = scalePitchClasses(root, scale.id);
      const chroma = PcSet.chroma(pcs.map((pc) => ASCII[pc]));
      // A symmetric scale (the chromatic one) is the same set on every root:
      // keep it once, on the first root.
      const key = `${scale.id}:${chroma}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const holds = PcSet.isNoteIncludedIn(chroma);
      const matched = names.filter((n) => holds(n)).length;
      out.push({
        root,
        scale: scale.id,
        pcs,
        matched,
        total: selection.length,
      });
    }
  }
  const rank = (m: ScaleMatch) =>
    (m.root === first ? 0 : 1) * 1000 +
    SCALES.findIndex((s) => s.id === m.scale) * 20 +
    toPitchClass(m.root - first);
  return out.sort((a, b) => a.pcs.length - b.pcs.length || rank(a) - rank(b));
}

/**
 * F060, F064: the scales that hold every selected note, fewest scale notes
 * first. Empty when nothing is selected.
 */
export function compatibleScales(
  notes: readonly PitchClass[],
  limit = 8,
): ScaleMatch[] {
  const selection = distinct(notes);
  if (selection.length === 0) return [];
  return allMatches(selection)
    .filter((m) => m.matched === selection.length)
    .slice(0, limit);
}

/** F066: the share of the selected notes a partial scale must hold (rounded up). */
export const PARTIAL_PERCENT = 70;

/**
 * F066: with 3 or more notes, the scales that hold at least 70 % (rounded up)
 * but not all of the selected notes. Most matched notes first, then fewest
 * scale notes.
 */
export function partialScales(
  notes: readonly PitchClass[],
  limit = 6,
): ScaleMatch[] {
  const selection = distinct(notes);
  if (selection.length < 3) return [];
  const needed = Math.ceil((selection.length * PARTIAL_PERCENT) / 100);
  return allMatches(selection)
    .filter((m) => m.matched >= needed && m.matched < selection.length)
    .sort((a, b) => b.matched - a.matched)
    .slice(0, limit);
}
