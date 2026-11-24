"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  clearRhythmPaused,
  installRhythmPlayer,
  useRhythmPlayer,
} from "@/audio";
import { Button } from "@/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/components/tabs";
import { toast } from "@/ui/components/toaster";
import { ModulePage } from "@/ui/module-page";
import { BuilderTab } from "./builder-tab";
import { loadIntoBuilder } from "./library-panel";
import { progressionFromHash, type ProgressionData } from "./share";
import { StylesTab } from "./styles-tab";
import { Timeline, toggleTimeline } from "./timeline";

export type ProgressionsTab = "styles" | "builder";

const isInteractive = (target: EventTarget | null) =>
  target instanceof Element &&
  target.closest(
    "button, a, input, select, textarea, [role=button], [role=menuitem], [role=dialog], [contenteditable=true]",
  ) !== null;

/** Space plays or stops the timeline when the focus is not on a control. */
function useSpaceShortcut() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || e.altKey || e.ctrlKey || e.metaKey)
        return;
      if (isInteractive(e.target) || document.querySelector("[role=dialog]"))
        return;
      e.preventDefault();
      toggleTimeline();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

/** A share link (#p=…) opens the progression in the builder after a confirmation. */
function SharedLink({ onOpen }: { onOpen: () => void }) {
  const t = useTranslations("modules.progressions");
  const [data, setData] = useState<ProgressionData | null>(null);
  useEffect(() => {
    const found = progressionFromHash(window.location.hash);
    if (found === undefined) return;
    const clear = () =>
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    if (found === null) {
      toast.error(t("shared.invalid"));
      clear();
      return;
    }
    clear();
    // The hash is read once, after mount (it is not on the server).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(found);
  }, [t]);
  return (
    <Dialog open={data !== null} onOpenChange={(o) => !o && setData(null)}>
      <DialogContent closeLabel={t("editor.close")}>
        <DialogHeader>
          <DialogTitle>{t("shared.title")}</DialogTitle>
          <DialogDescription>
            {t("shared.body", { count: data?.chords.length ?? 0 })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setData(null)}>
            {t("builder.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (data) loadIntoBuilder(data);
              setData(null);
              onOpen();
            }}
          >
            {t("shared.open")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PausedNotice() {
  const t = useTranslations("modules.progressions");
  const { paused } = useRhythmPlayer();
  if (!paused) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm"
    >
      <span className="flex-1">{t("paused")}</span>
      <Button size="sm" variant="ghost" onClick={clearRhythmPaused}>
        {t("editor.close")}
      </Button>
    </div>
  );
}

function ProgressionsTabs() {
  const t = useTranslations("modules.progressions");
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tab: ProgressionsTab =
    params.get("tab") === "builder" ? "builder" : "styles";
  const setTab = (next: ProgressionsTab) =>
    router.replace(`${pathname}?tab=${next}`, { scroll: false });
  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as ProgressionsTab)}
      className="flex flex-col gap-5"
    >
      <TabsList aria-label={t("tabs.label")} className="self-start">
        <TabsTrigger value="styles">{t("tabs.styles")}</TabsTrigger>
        <TabsTrigger value="builder">{t("tabs.builder")}</TabsTrigger>
      </TabsList>
      <TabsContent value="styles" className="outline-none">
        <StylesTab />
      </TabsContent>
      <TabsContent value="builder" className="outline-none">
        <BuilderTab />
      </TabsContent>
      <SharedLink onOpen={() => setTab("builder")} />
    </Tabs>
  );
}

/** Progressões (F069): Estilos and Construtor, with the shared timeline under both. */
export function ProgressionsView() {
  const t = useTranslations("modules.progressions");
  useEffect(() => installRhythmPlayer(), []);
  useSpaceShortcut();
  return (
    <ModulePage title={t("title")} description={t("description")}>
      <PausedNotice />
      <Suspense
        fallback={
          <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />
        }
      >
        <ProgressionsTabs />
      </Suspense>
      <Timeline />
    </ModulePage>
  );
}
