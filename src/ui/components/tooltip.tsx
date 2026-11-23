"use client";

import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../cn";

export const TooltipProvider = TooltipPrimitive.Provider;

/** A tooltip repeats a visible or accessible name; it never holds the only copy of information (hover-only fails on touch). */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
  ...props
}: { content: ReactNode; children: ReactNode; side?: "top" | "right" | "bottom" | "left" } & ComponentProps<
  typeof TooltipPrimitive.Content
>) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className={cn(
            "z-(--z-tooltip) rounded-md bg-neutral-900 px-2 py-1 text-xs text-neutral-50 shadow-2 dark:bg-neutral-100 dark:text-neutral-900",
            className,
          )}
          {...props}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
