"use client";

import { PlayIcon, SquareIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "../cn";

/** Play / stop toggle. */
export function TransportButton({
  playing,
  onToggle,
  className,
}: {
  playing: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const t = useTranslations("transport");
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={playing ? t("stop") : t("play")}
      className={cn(
        "grid size-11 place-items-center rounded-full bg-accent text-accent-fg shadow-2 transition-transform active:scale-95",
        className,
      )}
    >
      {playing ? <SquareIcon className="size-4 fill-current" aria-hidden /> : <PlayIcon className="size-4 fill-current" aria-hidden />}
    </button>
  );
}
