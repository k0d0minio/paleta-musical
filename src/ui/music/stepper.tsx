"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { cn } from "../cn";

export interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  /** Shows the label visibly (default) or only to screen readers. */
  hideLabel?: boolean;
  className?: string;
}

/** A − value + control. The value is announced as it changes. */
export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  hideLabel,
  className,
}: StepperProps) {
  const t = useTranslations("controls");
  const id = useId();
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div
      role="group"
      aria-labelledby={id}
      className={cn("flex items-center gap-1", className)}
    >
      <span
        id={id}
        className={cn(
          "mr-1 text-xs font-medium text-fg-muted",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </span>
      <button
        type="button"
        aria-label={t("decrease", { label })}
        disabled={value <= min}
        onClick={() => set(value - step)}
        className="grid size-11 place-items-center rounded-md text-fg hover:bg-surface-2 disabled:opacity-40"
      >
        <MinusIcon className="size-4" aria-hidden />
      </button>
      <output
        aria-live="polite"
        className="min-w-8 text-center text-base font-semibold tabular"
      >
        {format ? format(value) : value}
      </output>
      <button
        type="button"
        aria-label={t("increase", { label })}
        disabled={value >= max}
        onClick={() => set(value + step)}
        className="grid size-11 place-items-center rounded-md text-fg hover:bg-surface-2 disabled:opacity-40"
      >
        <PlusIcon className="size-4" aria-hidden />
      </button>
    </div>
  );
}
