"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { HotkeysProvider } from "react-hotkeys-hook";
import { audioEngine } from "@/audio";
import { I18nProvider } from "@/i18n";
import { NavigatorProvider, createNavigator } from "@/nav";
import { useAppStore, useSettings } from "@/state";
import { Toaster } from "@/ui/components/toaster";
import { TooltipProvider } from "@/ui/components/tooltip";
import { MODULES } from "./modules";
import { AppRuntime } from "./runtime";

function Navigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const navigator = useMemo(
    () =>
      createNavigator({
        modules: MODULES,
        push: (href) => router.push(href),
        stopAll: () => audioEngine.stopAll(),
        getCurrent: () => useAppStore.getState().session.currentModule,
        setCurrent: (id) => useAppStore.getState().setCurrentModule(id),
      }),
    [router],
  );
  return <NavigatorProvider value={navigator}>{children}</NavigatorProvider>;
}

function Motion({ children }: { children: ReactNode }) {
  const { motion } = useSettings();
  const reducedMotion =
    motion === "reduce" ? "always" : motion === "full" ? "never" : "user";
  return <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <I18nProvider>
        <Motion>
          <TooltipProvider delayDuration={400}>
            <HotkeysProvider initiallyActiveScopes={["*"]}>
              <Navigation>
                <AppRuntime />
                {children}
                <Toaster />
              </Navigation>
            </HotkeysProvider>
          </TooltipProvider>
        </Motion>
      </I18nProvider>
    </ThemeProvider>
  );
}
