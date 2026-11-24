"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/ui/cn";

/** A labelled native select (works with keyboard, touch and screen readers everywhere). */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
  testId,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
  testId?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={id} className="text-xs font-medium text-fg-muted">
        {label}
      </label>
      <select
        id={id}
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-11 min-w-0 rounded-md border border-border bg-surface px-2 text-sm font-medium text-fg"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A labelled range input with its value shown. */
export function RangeField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  disabled,
  children,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-fg-muted">
          {label}
        </label>
        <output htmlFor={id} className="text-xs font-semibold tabular">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full accent-(--fg) disabled:opacity-40"
      />
      {children}
    </div>
  );
}
