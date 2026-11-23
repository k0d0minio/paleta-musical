"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { cn } from "../cn";

/** A BPM number field (40–220 by default) with tabular numbers. Commits on blur or Enter. */
export function BpmField({
  value,
  onChange,
  min = 40,
  max = 220,
  className,
}: {
  value: number;
  onChange: (bpm: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  const t = useTranslations("controls");
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = Number.parseInt(draft, 10);
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
    setDraft(null);
  };
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label htmlFor={id} className="text-xs font-medium text-fg-muted">
        {t("bpm")}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft ?? value}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="h-11 w-20 rounded-md border border-border bg-surface px-2 text-center font-semibold tabular"
      />
    </div>
  );
}
