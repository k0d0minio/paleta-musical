"use client";

import { useTranslations } from "next-intl";
import { formatNoteName, noteLabel, type KeyContext, type NoteNameStyle, type PitchClass, type Spelling } from "@/theory";
import { useSettings } from "@/state";
import { cn } from "../cn";

export interface NoteNameProps {
  pc: PitchClass;
  /** Defaults to the setting. */
  style?: NoteNameStyle;
  spelling?: Spelling;
  keyContext?: KeyContext;
  octave?: number;
  /** With style "both": letter above, solfège below. */
  stacked?: boolean;
  className?: string;
}

/** A note name as letter, solfège or both (setting). The letter always stays readable for screen readers. */
export function NoteName({ pc, style, spelling, keyContext, octave, stacked, className }: NoteNameProps) {
  const settings = useSettings();
  const label = noteLabel(pc, spelling ?? settings.spelling, keyContext);
  const resolved = style ?? settings.noteNames;
  if (stacked && resolved === "both") {
    return (
      <span className={cn("flex flex-col items-center leading-tight", className)}>
        <span>{label.letter}</span>
        <span className="text-[0.8em] font-medium opacity-80">{label.solfege}</span>
      </span>
    );
  }
  const text = formatNoteName(label, resolved);
  return (
    <span className={className}>
      {text}
      {octave !== undefined && <sub className="ml-px text-[0.7em] tabular">{octave}</sub>}
    </span>
  );
}

export function useNoteNameText() {
  const settings = useSettings();
  const t = useTranslations("notes");
  return (pc: PitchClass, octave?: number) => {
    const text = formatNoteName(noteLabel(pc, settings.spelling), settings.noteNames);
    return octave === undefined ? text : `${text}, ${t("octaveValue", { octave })}`;
  };
}
