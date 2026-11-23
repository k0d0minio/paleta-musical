"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../cn";

/** A segmented single choice (radio-like), with roving focus and arrow keys. */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ...props
}: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      className={cn(
        "inline-flex w-full flex-wrap gap-1 rounded-lg bg-surface-2 p-1",
        className,
      )}
      {...props}
    >
      {options.map((o) => (
        <ToggleGroupPrimitive.Item
          key={o.value}
          value={o.value}
          className="min-h-11 flex-1 rounded-md px-3 text-sm font-medium text-fg-muted transition-colors hover:text-fg data-[state=on]:bg-surface data-[state=on]:text-fg data-[state=on]:shadow-1"
        >
          {o.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}

export function Toggle({
  className,
  ...props
}: ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-md border border-border px-3 text-sm data-[state=on]:bg-accent data-[state=on]:text-accent-fg",
        className,
      )}
      {...props}
    />
  );
}

export const ToggleGroup = ToggleGroupPrimitive.Root;
