import type { ComponentProps } from "react";
import { cn } from "../cn";

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-sm border border-border-strong bg-surface px-1.5 font-sans text-xs font-medium text-fg-muted shadow-[inset_0_-1px_0_var(--border-strong)]",
        className,
      )}
      {...props}
    />
  );
}
