import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";

/** The frame of a module: title, description and the module area. */
export function ModulePage({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby="module-title"
      className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6", className)}
    >
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1
            id="module-title"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {title}
          </h1>
          {description && <p className="text-fg-muted">{description}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

/** An empty state: an icon, a title and one sentence. */
export function EmptyState({
  icon: Icon,
  title,
  body,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-surface/60 px-6 py-14 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-surface-2">
        <Icon className="size-7 text-fg-muted" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-fg-muted">{body}</p>
      {children}
    </div>
  );
}
