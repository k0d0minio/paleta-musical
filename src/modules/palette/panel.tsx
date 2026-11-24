import type { ReactNode } from "react";
import { cn } from "@/ui/cn";

/** A titled panel of the module area. */
export function Panel({
  title,
  actions,
  children,
  className,
  labelledBy,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  labelledBy: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-1 sm:p-5",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={labelledBy} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

/** A small heading inside a panel. */
export function SubHeading({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <h3
      id={id}
      className="text-xs font-semibold tracking-wide text-fg-muted uppercase"
    >
      {children}
    </h3>
  );
}

/** A colour dot of a note (F276), next to its name. */
export function NoteDot({ pc, className }: { pc: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2.5 shrink-0 rounded-full", className)}
      style={{ background: `var(--note-${pc})` }}
    />
  );
}
