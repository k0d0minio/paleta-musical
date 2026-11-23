import { Note as TonalNote, Scale } from "tonal";
import { type PitchClass } from "./pitch";
import { getScale, type ScaleId } from "./scales";

/** R1: letter names with sharps (the original app only used sharps). */
export const SHARP_LETTERS = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
] as const;
export const FLAT_LETTERS = [
  "C",
  "D♭",
  "D",
  "E♭",
  "E",
  "F",
  "G♭",
  "G",
  "A♭",
  "A",
  "B♭",
  "B",
] as const;

/** R1: Portuguese solfège names. */
const SOLFEGE_BASE: Record<string, string> = {
  C: "Dó",
  D: "Ré",
  E: "Mi",
  F: "Fá",
  G: "Sol",
  A: "Lá",
  B: "Si",
};

export type NoteNameStyle = "letter" | "solfege" | "both";
export type Spelling = "sharps" | "flats" | "key";

export interface KeyContext {
  readonly tonic: PitchClass;
  readonly scale: ScaleId;
}

/** Conventional tonic spelling per pitch class (major-like and minor-like keys). */
const MAJOR_TONICS = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];
const MINOR_TONICS = [
  "C",
  "C#",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "Bb",
  "B",
];

function toUnicode(name: string): string {
  return name.replace(/#/g, "♯").replace(/b/g, "♭");
}

function fromTonal(name: string): string {
  // tonal names: "C#", "Db", "Cbb"… The letter is the first character.
  return name.charAt(0) + toUnicode(name.slice(1));
}

/**
 * Spells a pitch class in a key: the name the scale of that key gives it, else
 * the accidental direction of the key.
 */
function spellInKey(pc: PitchClass, key: KeyContext): string {
  const scale = getScale(key.scale);
  const minorLike = scale.intervals.includes(3) && !scale.intervals.includes(4);
  const tonicName = (minorLike ? MINOR_TONICS : MAJOR_TONICS)[key.tonic] ?? "C";
  if (scale.tonal) {
    const notes = Scale.get(`${tonicName} ${scale.tonal}`).notes;
    const match = notes.find((n) => TonalNote.chroma(n) === pc);
    if (match) return fromTonal(match);
  }
  const flatKey = tonicName.includes("b") || tonicName === "F";
  return (flatKey ? FLAT_LETTERS : SHARP_LETTERS)[pc];
}

/** The letter name of a pitch class with the chosen spelling. */
export function letterName(
  pc: PitchClass,
  spelling: Spelling = "sharps",
  key?: KeyContext,
): string {
  if (spelling === "flats") return FLAT_LETTERS[pc];
  if (spelling === "key" && key) return spellInKey(pc, key);
  return SHARP_LETTERS[pc];
}

/** The Portuguese solfège name that matches a letter name (C♯ → Dó♯). */
export function solfegeName(letter: string): string {
  return (SOLFEGE_BASE[letter.charAt(0)] ?? letter) + letter.slice(1);
}

export interface NoteLabel {
  readonly letter: string;
  readonly solfege: string;
}

export function noteLabel(
  pc: PitchClass,
  spelling: Spelling = "sharps",
  key?: KeyContext,
): NoteLabel {
  const letter = letterName(pc, spelling, key);
  return { letter, solfege: solfegeName(letter) };
}

/** The text of a note name for a display style. */
export function formatNoteName(label: NoteLabel, style: NoteNameStyle): string {
  if (style === "letter") return label.letter;
  if (style === "solfege") return label.solfege;
  return `${label.letter} · ${label.solfege}`;
}
