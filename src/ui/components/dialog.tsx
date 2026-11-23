"use client";

import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

function Overlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-(--z-overlay) bg-neutral-950/40 backdrop-blur-[2px]",
        className,
      )}
      {...props}
    />
  );
}

type ContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  /** "dialog" is centred; "sheet" slides from the side on desktop and from the bottom on mobile. */
  variant?: "dialog" | "sheet";
  closeLabel: string;
};

export function DialogContent({
  className,
  children,
  variant = "dialog",
  closeLabel,
  ...props
}: ContentProps) {
  return (
    <DialogPrimitive.Portal>
      <Overlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-(--z-modal) flex flex-col gap-4 border border-border bg-surface text-fg shadow-3 outline-none",
          variant === "dialog" &&
            "top-1/2 left-1/2 max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl p-6",
          variant === "sheet" &&
            "inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-[28rem] md:rounded-l-2xl md:rounded-tr-none md:p-6",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute top-3 right-3 grid size-11 place-items-center rounded-md text-fg-muted hover:bg-surface-2 hover:text-fg"
          aria-label={closeLabel}
        >
          <XIcon className="size-5" aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-1 pr-10", className)} {...props} />
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-fg-muted", className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
