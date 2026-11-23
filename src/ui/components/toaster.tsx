"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

/** Status messages (errors and confirmations). Sonner announces them with aria-live. */
export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "!rounded-lg !border-border !bg-surface !text-fg !shadow-3",
          description: "!text-fg-muted",
        },
      }}
    />
  );
}

export { toast } from "sonner";
