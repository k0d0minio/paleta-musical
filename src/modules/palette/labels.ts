"use client";

import { useTranslations } from "next-intl";
import { useSettings } from "@/state";
import {
  formatNoteName,
  getChordType,
  noteLabel,
  type ChordTypeId,
  type KeyContext,
  type PitchClass,
  type ScaleId,
} from "@/theory";

/** Note names with the global name style and spelling (and a key when the spelling is "key"). */
export function useNoteText() {
  const settings = useSettings();
  return {
    /** The name in the name-style setting ("C · Dó"). */
    name: (pc: PitchClass, key?: KeyContext) =>
      formatNoteName(noteLabel(pc, settings.spelling, key), settings.noteNames),
    /** The letter name only ("C♯"). */
    letter: (pc: PitchClass, key?: KeyContext) =>
      noteLabel(pc, settings.spelling, key).letter,
  };
}

/** Scale and chord-type names from the messages (R3, R4 PT-PT and EN names). */
export function useTheoryNames() {
  const tScale = useTranslations("scales");
  const tType = useTranslations("chordTypes");
  const { letter } = useNoteText();
  return {
    scale: (id: ScaleId) => tScale(id),
    chordType: (id: ChordTypeId) => tType(id),
    /** "C♯m7", for text and labels. */
    chordSymbol: (root: PitchClass, type: ChordTypeId, key?: KeyContext) =>
      `${letter(root, key)}${getChordType(type).symbol}`,
  };
}
