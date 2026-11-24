"use client";

import { useTranslations } from "next-intl";
import {
  getChordType,
  invertIntervals,
  letterName,
  toPitchClass,
  type ChordRef,
} from "@/theory";
import { cn } from "@/ui/cn";
import { ChordName, NoteName } from "@/ui/music";

/** The bass pitch class of a chord with its inversion. */
export function bassOf(chord: ChordRef) {
  const lowest =
    invertIntervals(getChordType(chord.type).intervals, chord.inversion)[0] ??
    0;
  return toPitchClass(chord.root + lowest);
}

/** Plain text of a chord, e.g. "C♯m7/E" (aria labels, toasts). */
export function chordText(chord: ChordRef): string {
  const base = `${letterName(chord.root)}${getChordType(chord.type).symbol}`;
  return chord.inversion > 0 ? `${base}/${letterName(bassOf(chord))}` : base;
}

/**
 * A chord symbol with the root in its note colour (F276), the bass after a
 * slash for an inversion, and a tension mark (pattern + text, F084, F138).
 */
export function ChordLabel({
  chord,
  tension = false,
  className,
}: {
  chord: ChordRef;
  tension?: boolean;
  className?: string;
}) {
  const t = useTranslations("modules.progressions");
  return (
    <span className={cn("inline-flex items-baseline gap-0.5", className)}>
      <ChordName chord={chord} />
      {chord.inversion > 0 && (
        <span className="font-semibold text-fg-muted">
          /<NoteName pc={bassOf(chord)} style="letter" />
        </span>
      )}
      {tension && (
        <span
          className="ml-1 self-center rounded-sm border border-dashed border-tension px-1 text-[0.65rem] font-semibold tracking-wide text-tension uppercase"
          data-tension
        >
          {t("tension")}
        </span>
      )}
    </span>
  );
}
