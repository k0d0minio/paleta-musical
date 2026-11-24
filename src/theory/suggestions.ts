import type { ChordRef, ChordTypeId } from "./chords";
import { toPitchClass, type PitchClass } from "./pitch";

/**
 * One R11 rule. `label` is the Roman numeral (notation); `hint` is the
 * message key of the reason in brackets (`modules.progressions.hints.<hint>`).
 */
export interface SuggestionRule {
  readonly offset: number;
  readonly type: ChordTypeId;
  readonly label: string;
  readonly hint: string | null;
  readonly strength: number;
}

const r = (
  offset: number,
  type: ChordTypeId,
  label: string,
  hint: string | null,
  strength: number,
): SuggestionRule => ({ offset, type, label, hint, strength });

const MAJOR_RULES = [
  r(5, "major", "IV", "subdominant", 5),
  r(7, "major", "V", "dominant", 5),
  r(9, "minor", "vi", "relativeMinor", 4),
  r(5, "maj7", "IVmaj7", "jazz", 3),
  r(7, "dom7", "V7", "tension", 4),
  r(2, "minor", "ii", "preparation", 3),
  r(4, "minor", "iii", null, 2),
  r(0, "sus4", "Isus4", null, 2),
  r(10, "major", "♭VII", "hipHop", 3),
  r(8, "major", "♭VI", "cinematic", 3),
  r(0, "maj7", "Imaj7", "jazz", 2),
];

/** R11: next-chord rules per type of the last chord. Any other type uses the major rules. */
export const SUGGESTION_RULES: Readonly<
  Partial<Record<ChordTypeId, readonly SuggestionRule[]>>
> = {
  major: MAJOR_RULES,
  minor: [
    r(5, "minor", "iv", "minorSubdominant", 5),
    r(7, "major", "V", "dominant", 5),
    r(3, "major", "♭III", "relativeMajor", 4),
    r(10, "major", "♭VII", "trap", 4),
    r(8, "major", "♭VI", "dark", 4),
    r(0, "min7", "i7", "jazz", 3),
    r(5, "min7", "iv7", null, 3),
    r(2, "dim", "ii°", "tension", 2),
    r(7, "dom7", "V7", "resolution", 4),
    r(3, "maj7", "♭IIImaj7", null, 2),
  ],
  dom7: [
    r(-7, "major", "I", "perfectResolution", 6),
    r(-7, "minor", "i", "minor", 5),
    r(6, "dom7", "♭II7", "tritoneSub", 3),
    r(-7, "maj7", "Imaj7", "jazz", 4),
    r(5, "major", "IV", "deceptive", 3),
  ],
  maj7: [
    r(5, "maj7", "IVmaj7", null, 5),
    r(2, "min7", "ii7", "twoFive", 5),
    r(7, "dom7", "V7", "twoFiveOne", 5),
    r(9, "min7", "vi7", null, 3),
    r(0, "major", "I", "simplify", 2),
  ],
  min7: [
    r(5, "dom7", "V7", "twoFiveOne", 6),
    r(0, "minor", "i", "simple", 2),
    r(5, "major", "IV", null, 3),
    r(3, "maj7", "♭IIImaj7", null, 3),
    r(7, "minor", "v", "minor", 2),
  ],
  dim: [
    r(1, "major", "♭II", "chromatic", 5),
    r(1, "minor", "♭ii", "minor", 4),
    r(-1, "minor", "VII→i", null, 5),
    r(3, "major", "♭III", null, 3),
  ],
  sus2: [
    r(0, "major", "I", "resolve", 6),
    r(0, "minor", "i", "minor", 4),
    r(5, "major", "IV", null, 3),
  ],
  sus4: [
    r(0, "major", "I", "resolve", 6),
    r(0, "minor", "i", "minor", 4),
    r(7, "major", "V", null, 3),
  ],
  aug: [
    r(5, "major", "IV", null, 4),
    r(0, "major", "I", null, 3),
    r(8, "major", "♭VI", null, 2),
  ],
  dim7: [
    r(1, "major", "♭II", null, 5),
    r(-1, "minor", "i", "resolution", 5),
    r(3, "major", "♭III", null, 3),
  ],
  add9: [
    r(5, "major", "IV", null, 5),
    r(7, "major", "V", null, 4),
    r(9, "minor", "vi", null, 3),
  ],
};

export interface Suggestion {
  readonly chord: ChordRef;
  readonly label: string;
  readonly hint: string | null;
  readonly strength: number;
  /** F127: round(strength), capped at 5. */
  readonly rating: number;
}

/**
 * R11 (fixes U01: every suggestion keeps its type). From the last chord of the
 * line: the rules of its type; with 2 or more chords, bonuses (+1 at +5 when
 * the last root is a fifth above the previous root; +0.5 at +5 or +7). Then
 * de-duplicate by root and type (first kept), sort by strength (stable), keep 10.
 */
export function suggestNext(line: readonly ChordRef[]): Suggestion[] {
  const last = line.at(-1);
  if (!last) return [];
  const previous = line.at(-2);
  const rules = SUGGESTION_RULES[last.type] ?? MAJOR_RULES;
  const fifthMove =
    previous !== undefined && toPitchClass(last.root - previous.root) === 7;

  const scored = rules.map((rule) => {
    const offset = toPitchClass(rule.offset);
    let strength = rule.strength;
    if (previous !== undefined) {
      if (fifthMove && offset === 5) strength += 1;
      if (offset === 5 || offset === 7) strength += 0.5;
    }
    const root: PitchClass = toPitchClass(last.root + rule.offset);
    return {
      chord: { root, type: rule.type, inversion: 0 },
      label: rule.label,
      hint: rule.hint,
      strength,
      rating: Math.min(5, Math.round(strength)),
    } satisfies Suggestion;
  });

  const seen = new Set<string>();
  const unique = scored.filter((s) => {
    const id = `${s.chord.root}:${s.chord.type}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return unique
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.strength - a.s.strength || a.i - b.i)
    .map(({ s }) => s)
    .slice(0, 10);
}
