"use client";

import { CommandIcon, KeyboardIcon, SettingsIcon } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useGoTo, type ModuleDefinition } from "@/nav";
import { cn } from "@/ui/cn";
import { Tooltip } from "@/ui/components/tooltip";
import { MODULES } from "./modules";
import { useShellUi } from "./ui-store";
import { useCurrentModule } from "./use-current-module";

function useModuleLink() {
  const goTo = useGoTo();
  return (m: ModuleDefinition) => ({
    href: m.route,
    onNavigate: (e: { preventDefault(): void }) => {
      e.preventDefault();
      goTo(m.id);
    },
  });
}

/** Desktop: a side navigation rail. */
export function NavRail() {
  const t = useTranslations();
  const current = useCurrentModule();
  const link = useModuleLink();
  const ui = useShellUi();
  return (
    <nav
      aria-label={t("app.mainNav")}
      className="sticky top-0 hidden h-dvh w-24 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface px-2 py-4 md:flex"
    >
      <div
        aria-hidden
        className="mb-4 grid size-12 place-items-center rounded-2xl"
        style={{
          background:
            "conic-gradient(var(--note-0), var(--note-1), var(--note-2), var(--note-3), var(--note-4), var(--note-5), var(--note-6), var(--note-7), var(--note-8), var(--note-9), var(--note-10), var(--note-11), var(--note-0))",
        }}
      >
        <span className="size-5 rounded-full bg-surface" />
      </div>
      <ul className="flex w-full flex-1 flex-col gap-1">
        {MODULES.map((m) => {
          const active = current === m.id;
          const Icon = m.icon;
          return (
            <li key={m.id}>
              <Link
                {...link(m)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.7rem] font-medium text-fg-muted transition-colors hover:text-fg",
                  active && "text-fg",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="rail-active"
                    className="absolute inset-0 -z-0 rounded-xl bg-surface-2"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <Icon className="relative size-5" aria-hidden />
                <span className="relative">
                  {t(`${m.messageKey}.title` as "modules.palette.title")}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-1">
        <Tooltip content={t("app.commandPalette")} side="right">
          <button
            type="button"
            aria-label={t("app.commandPalette")}
            onClick={() => ui.set({ commandOpen: true })}
            className="grid size-11 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            <CommandIcon className="size-5" aria-hidden />
          </button>
        </Tooltip>
        <Tooltip content={t("app.shortcuts")} side="right">
          <button
            type="button"
            aria-label={t("app.shortcuts")}
            onClick={() => ui.set({ helpOpen: true })}
            className="grid size-11 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            <KeyboardIcon className="size-5" aria-hidden />
          </button>
        </Tooltip>
        <Tooltip content={t("app.settings")} side="right">
          <button
            type="button"
            aria-label={t("app.settings")}
            onClick={() => ui.set({ settingsOpen: true })}
            className="grid size-11 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            <SettingsIcon className="size-5" aria-hidden />
          </button>
        </Tooltip>
      </div>
    </nav>
  );
}

/** Mobile: a bottom tab bar. */
export function TabBar() {
  const t = useTranslations();
  const current = useCurrentModule();
  const link = useModuleLink();
  return (
    <nav
      aria-label={t("app.mainNav")}
      className="border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid auto-cols-fr grid-flow-col">
        {MODULES.map((m) => {
          const active = current === m.id;
          const Icon = m.icon;
          return (
            <li key={m.id}>
              <Link
                {...link(m)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.65rem] font-medium text-fg-muted",
                  active && "text-fg",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-12 place-items-center rounded-full transition-colors",
                    active && "bg-surface-2",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="max-w-full truncate px-0.5">
                  {t(`${m.messageKey}.title` as "modules.palette.title")}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Mobile: the top bar with the app name and the settings. */
export function MobileHeader() {
  const t = useTranslations("app");
  const ui = useShellUi();
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-4 pt-[env(safe-area-inset-top)] md:hidden">
      <span className="flex h-14 items-center gap-2 font-semibold tracking-tight">
        <span
          aria-hidden
          className="size-6 rounded-lg"
          style={{
            background:
              "conic-gradient(var(--note-0), var(--note-2), var(--note-4), var(--note-6), var(--note-8), var(--note-10), var(--note-0))",
          }}
        />
        {t("name")}
      </span>
      <button
        type="button"
        aria-label={t("settings")}
        onClick={() => ui.set({ settingsOpen: true })}
        className="grid size-11 place-items-center rounded-lg text-fg-muted hover:bg-surface-2"
      >
        <SettingsIcon className="size-5" aria-hidden />
      </button>
    </header>
  );
}
