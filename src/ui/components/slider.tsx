"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../cn";

export function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root> & { "aria-label": string }) {
  const { "aria-label": label, ...rest } = props;
  return (
    <SliderPrimitive.Root
      className={cn("relative flex h-11 w-full touch-none items-center select-none", className)}
      {...rest}
    >
      <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-surface-2">
        <SliderPrimitive.Range className="absolute h-full bg-fg" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={label}
        className="block size-5 rounded-full border-2 border-fg bg-surface shadow-2 transition-transform hover:scale-110"
      />
    </SliderPrimitive.Root>
  );
}
