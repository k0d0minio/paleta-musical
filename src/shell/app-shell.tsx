"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { ModuleBoundary } from "@/ui/module-boundary";
import { Banners } from "./banners";
import { CommandPalette } from "./command-palette";
import { MobileHeader, NavRail, TabBar } from "./module-nav";
import { SettingsSheet } from "./settings-sheet";
import { ShortcutHelp } from "./shortcut-help";
import { TransportBar } from "./transport-bar";

/** Desktop first: a side rail, the module area and the transport bar. Mobile: a header, the module area, the transport bar and a tab bar. */
export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations("app");
  return (
    <div className="flex h-dvh overflow-hidden">
      <a
        href="#main"
        className="fixed top-2 left-2 z-(--z-toast) -translate-y-20 rounded-md bg-accent px-4 py-2 text-accent-fg focus:translate-y-0"
      >
        {t("skipToContent")}
      </a>
      <NavRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <Banners />
        <main id="main" tabIndex={-1} className="flex-1 overflow-y-auto px-4 py-6 outline-none sm:px-6 md:px-10 md:py-10">
          <ModuleBoundary>{children}</ModuleBoundary>
        </main>
        <TransportBar />
        <TabBar />
      </div>
      <SettingsSheet />
      <ShortcutHelp />
      <CommandPalette />
    </div>
  );
}
