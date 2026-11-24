"use client";

import { useSettings } from "@/state";
import {
  formatNoteName,
  getChordType,
  majorKeyName,
  minorKeyName,
  solfegeName,
  spellInMajorKey,
  type ChordRef,
  type PitchClass,
} from "@/theory";

/**
 * Key and chord names of the Harmonia module. They follow the spelling
 * setting; with "by key" the circle names follow R14 (A♭, E♭, B♭).
 */
export function useKeyNames() {
  const { spelling, noteNames } = useSettings();
  return {
    majorLetter: (pc: PitchClass) => majorKeyName(pc, spelling),
    minorLetter: (pc: PitchClass) => minorKeyName(pc, spelling),
    minorShort: (pc: PitchClass) => `${minorKeyName(pc, spelling)}m`,
    /** Letter and/or solfège, as the note-name setting says. */
    majorFull: (pc: PitchClass) => {
      const letter = majorKeyName(pc, spelling);
      return formatNoteName(
        { letter, solfege: solfegeName(letter) },
        noteNames,
      );
    },
    minorFull: (pc: PitchClass) => {
      const letter = minorKeyName(pc, spelling);
      return formatNoteName(
        { letter, solfege: solfegeName(letter) },
        noteNames,
      );
    },
    /** A note spelled in the key of `tonic`. */
    note: (pc: PitchClass, tonic: PitchClass) =>
      spellInMajorKey(pc, tonic, spelling),
    noteFull: (pc: PitchClass, tonic: PitchClass) => {
      const letter = spellInMajorKey(pc, tonic, spelling);
      return formatNoteName(
        { letter, solfege: solfegeName(letter) },
        noteNames,
      );
    },
    /** A chord symbol spelled in the key of `tonic`. */
    chord: (chord: ChordRef, tonic: PitchClass) =>
      spellInMajorKey(chord.root, tonic, spelling) +
      getChordType(chord.type).symbol,
  };
}
