"use client";

import { getChordType, type ChordRef, type KeyContext } from "@/theory";
import { cn } from "../cn";
import { NoteName } from "./note-name";

/** A chord symbol: the root in its note colour (F276) and the type suffix. */
export function ChordName({
  chord,
  keyContext,
  className,
}: {
  chord: ChordRef;
  /** Spells the root in this key when the spelling setting is "key". */
  keyContext?: KeyContext;
  className?: string;
}) {
  const type = getChordType(chord.type);
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-0.5 font-semibold",
        className,
      )}
    >
      <span
        aria-hidden
        className="mr-1 inline-block size-2.5 self-center rounded-full"
        style={{ background: `var(--note-${chord.root})` }}
      />
      <NoteName pc={chord.root} style="letter" keyContext={keyContext} />
      <span>{type.symbol}</span>
    </span>
  );
}
