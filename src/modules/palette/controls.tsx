"use client";

import { ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";
import { cn } from "@/ui/cn";
import { Slider } from "@/ui/components/slider";
import { tensionLevel } from "./tension";

/** A native select (best on touch and with screen readers), styled. */
export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-medium text-fg-muted">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="h-11 w-full appearance-none rounded-md border border-border bg-surface pr-9 pl-3 text-sm font-medium text-fg shadow-1"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-muted"
        />
      </div>
    </div>
  );
}

/**
 * The tension value (F034–F037): 0 (inside the scale) to 1 (chromatic).
 * Pointer, touch and keyboard (arrows, Page Up/Down, Home, End) change it
 * live; the status text follows.
 */
export function TensionField({
  value,
  onChange,
  onCommit,
}: {
  value: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}) {
  const t = useTranslations("modules.palette");
  const id = useId();
  const level = tensionLevel(value);
  const percent = Math.round(value * 100);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span id={id} className="text-xs font-medium text-fg-muted">
          {t("tension")}
        </span>
        <span className="text-sm font-semibold tabular" aria-live="polite">
          <span
            data-level={level}
            className={cn(
              level === "high" && "text-tension",
              level === "moderate" && "text-warning",
            )}
          >
            {t(`tensionLevel.${level}`)}
          </span>{" "}
          <span className="text-fg-muted">· {percent} %</span>
        </span>
      </div>
      <Slider
        aria-label={t("tension")}
        min={0}
        max={100}
        step={1}
        value={[percent]}
        onValueChange={([v]) => onChange((v ?? 0) / 100)}
        onValueCommit={([v]) => onCommit((v ?? 0) / 100)}
      />
    </div>
  );
}

/** A small on/off option button. */
export function OptionToggle({
  pressed,
  onChange,
  icon,
  children,
}: {
  pressed: boolean;
  onChange: (pressed: boolean) => void;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors [&_svg]:size-4",
        pressed
          ? "border-transparent bg-accent text-accent-fg"
          : "border-border bg-surface text-fg-muted hover:text-fg",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
