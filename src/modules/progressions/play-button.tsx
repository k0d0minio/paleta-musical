"use client";

import { PlayIcon, SquareIcon } from "lucide-react";
import { cn } from "@/ui/cn";

/** Play / stop toggle with a label that names what it plays. */
export function PlayButton({
  playing,
  onToggle,
  playLabel,
  stopLabel,
  className,
}: {
  playing: boolean;
  onToggle: () => void;
  playLabel: string;
  stopLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={playing ? stopLabel : playLabel}
      data-playing={playing || undefined}
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-fg shadow-2 transition-transform active:scale-95",
        className,
      )}
    >
      {playing ? (
        <SquareIcon className="size-4 fill-current" aria-hidden />
      ) : (
        <PlayIcon className="size-4 fill-current" aria-hidden />
      )}
    </button>
  );
}
